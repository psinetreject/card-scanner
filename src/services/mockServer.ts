import type { AuditLogEntry, AuthSession, Card, Claim, ModerationProposal, Observation, OutboxObservation, OutboxProposal, Print, Role, TrustProfile, UserTrustStats } from '../core/types';
import { validateCard, validatePrint, validateProposalPayload } from '../core/validation';
import { seedAliases, seedCards, seedPrints } from '../data/seed';

const rolePriority: Role[] = ['viewer', 'contributor', 'moderator', 'admin'];
const now = () => new Date().toISOString();
const norm = (v: string | number) => String(v).trim().toLowerCase();

class MockCentralServer {
  private cards: Card[] = structuredClone(seedCards);
  private prints: Print[] = structuredClone(seedPrints);
  private aliases = structuredClone(seedAliases);
  private proposals: ModerationProposal[] = [];
  private audits: AuditLogEntry[] = [];
  private claims: Claim[] = [];
  private observations: Observation[] = [];
  private trust = new Map<string, TrustProfile>();
  private cardVersions = new Map<string, Card[]>(this.cards.map((c) => [c.id, [structuredClone(c)]]));
  private hourlyRate = new Map<string, number[]>();

  requireRole(session: AuthSession, minimum: Role) {
    if (rolePriority.indexOf(session.role) < rolePriority.indexOf(minimum)) throw new Error('Forbidden');
  }

  login(role: Role): AuthSession {
    const id = `${role}-user`;
    if (!this.trust.has(id)) {
      this.trust.set(id, { principalId: id, createdAt: now(), lastUpdatedAt: now(), reputationScore: 0.7, acceptedCount: 0, rejectedCount: 0, spamFlagCount: 0 });
    }
    return { token: `mock-${role}-${Math.random().toString(36).slice(2)}`, userId: id, deviceId: `device-${Math.random().toString(36).slice(2, 9)}`, role };
  }

  pullUpdates(session: AuthSession) {
    this.requireRole(session, 'viewer');
    return {
      cards: this.cards.filter((c) => !c.deprecatedAt),
      prints: this.prints.filter((p) => !p.deprecatedAt),
      aliases: this.aliases,
      claims: this.claims,
      syncState: { lastSyncAt: now(), lastCardsVersion: Math.max(0, ...this.cards.map((c) => c.version)), lastPrintsVersion: Math.max(0, ...this.prints.map((p) => p.version)), lastAliasesVersion: Math.max(0, ...this.aliases.map((a) => a.version)), lastImagesVersion: 0 },
    };
  }

  submitProposals(session: AuthSession, proposals: OutboxProposal[]) {
    this.requireRole(session, 'contributor');
    const acceptedIds: string[] = [];
    const failed: { id: string; error: string }[] = [];
    for (const proposal of proposals) {
      const rateError = this.checkRate(session.deviceId);
      if (rateError) { failed.push({ id: proposal.localProposalId, error: rateError }); continue; }
      const validationErrors = validateProposalPayload(proposal.payload);
      if (validationErrors.length > 0) { failed.push({ id: proposal.localProposalId, error: validationErrors.join(', ') }); continue; }
      const flagged = this.isFlaggedContributor(session.userId);
      this.proposals.push({ proposalId: proposal.localProposalId, createdAt: proposal.createdAt, createdByDeviceId: session.deviceId, userId: session.userId, type: proposal.type, payload: proposal.payload, status: flagged ? 'reviewing' : 'new', flagged });
      acceptedIds.push(proposal.localProposalId);
    }
    return { acceptedIds, failed };
  }

  submitObservations(session: AuthSession, observations: OutboxObservation[]) {
    this.requireRole(session, 'contributor');
    const acceptedIds: string[] = [];
    const failed: { id: string; error: string }[] = [];
    for (const ob of observations) {
      if (!ob.targetType || !ob.targetId) { failed.push({ id: ob.localObservationId, error: 'targetType/targetId required' }); continue; }
      const existsRecent = this.observations.find((x) => x.principalId === session.userId && x.fieldPath === ob.fieldPath && (x.cardId === ob.targetId || x.printId === ob.targetId) && Date.now() - new Date(x.createdAt).getTime() < 24 * 60 * 60 * 1000);
      if (existsRecent) continue;
      this.observations.push({
        observationId: ob.localObservationId,
        createdAt: ob.createdAt,
        principalId: session.userId,
        scanRef: ob.scanRef,
        cardId: ob.targetType === 'card' ? ob.targetId : undefined,
        printId: ob.targetType === 'print' ? ob.targetId : undefined,
        fieldPath: ob.fieldPath,
        value: ob.value,
        valueNorm: norm(ob.value),
        ocrConfidence: ob.ocrConfidence,
        captureQualityScore: ob.captureQualityScore,
        status: 'active',
      });
      acceptedIds.push(ob.localObservationId);
    }
    this.recomputeClaims();
    return { acceptedIds, failed };
  }

  private recomputeClaims() {
    const groups = new Map<string, Observation[]>();
    for (const ob of this.observations.filter((o) => o.status === 'active')) {
      const targetId = ob.cardId ?? ob.printId;
      if (!targetId) continue;
      const k = `${ob.cardId ? 'card' : 'print'}:${targetId}:${ob.fieldPath}`;
      groups.set(k, [...(groups.get(k) ?? []), ob]);
    }

    for (const [key, list] of groups.entries()) {
      const [targetType, targetId, fieldPath] = key.split(':');
      const byValue = new Map<string, { totalWeight: number; principalSet: Set<string>; obsIds: string[]; value: string | number }>();
      let totalWeight = 0;
      for (const ob of list) {
        const tr = this.trust.get(ob.principalId)?.reputationScore ?? 0.5;
        const w = (0.5 + 0.5 * ob.ocrConfidence) * (0.6 + 0.4 * ob.captureQualityScore) * (0.5 + 0.5 * tr);
        totalWeight += w;
        const entry = byValue.get(ob.valueNorm) ?? { totalWeight: 0, principalSet: new Set(), obsIds: [], value: ob.value };
        entry.totalWeight += w;
        entry.principalSet.add(ob.principalId);
        entry.obsIds.push(ob.observationId);
        byValue.set(ob.valueNorm, entry);
      }
      const ranked = [...byValue.entries()].sort((a, b) => b[1].totalWeight - a[1].totalWeight);
      const winner = ranked[0];
      if (!winner) continue;
      const consensusScore = totalWeight ? winner[1].totalWeight / totalWeight : 0;
      const consensusCount = winner[1].principalSet.size;
      const disagreementCount = [...ranked.slice(1)].reduce((acc, [, v]) => acc + v.principalSet.size, 0);
      const existing = this.claims.find((c) => c.targetType === targetType && c.targetId === targetId && c.fieldPath === fieldPath && c.proposedValueNorm === winner[0] && c.status === 'open');
      const claim: Claim = existing ?? {
        claimId: crypto.randomUUID(), createdAt: now(), targetType: targetType as 'card' | 'print', targetId, fieldPath,
        proposedValue: winner[1].value, proposedValueNorm: winner[0], generatedFrom: winner[1].obsIds, status: 'open',
        consensusScore: 0, consensusCount: 0, disagreementCount: 0, lastComputedAt: now(), competingValues: []
      };
      claim.consensusScore = consensusScore;
      claim.consensusCount = consensusCount;
      claim.disagreementCount = disagreementCount;
      claim.lastComputedAt = now();
      claim.competingValues = ranked.map(([valueNorm, v]) => ({ valueNorm, totalWeight: v.totalWeight, principals: v.principalSet.size }));
      claim.generatedFrom = winner[1].obsIds;

      if (!existing) this.claims.push(claim);
      if (claim.status === 'open' && consensusScore >= 0.85 && consensusCount >= 3 && disagreementCount <= 1) {
        this.applyClaim(claim, { userId: 'system', role: 'admin' } as AuthSession, true);
      }
    }
  }

  private applyClaim(claim: Claim, actor: AuthSession, auto = false) {
    if (claim.targetType === 'card') {
      const card = this.cards.find((c) => c.id === claim.targetId);
      if (card) {
        const patch: any = { [claim.fieldPath.replace('cards.', '')]: claim.proposedValue, version: card.version + 1, updatedAt: now() };
        Object.assign(card, patch);
        card.consensus = { ...(card.consensus ?? {}), [claim.fieldPath]: { consensusScore: claim.consensusScore, consensusCount: claim.consensusCount, disagreementCount: claim.disagreementCount, lastComputedAt: claim.lastComputedAt } };
      }
    }
    if (claim.targetType === 'print') {
      const print = this.prints.find((p) => p.printId === claim.targetId);
      if (print) {
        const patch: any = { [claim.fieldPath.replace('prints.', '')]: claim.proposedValue, version: print.version + 1, updatedAt: now() };
        Object.assign(print, patch);
        print.consensus = { ...(print.consensus ?? {}), [claim.fieldPath]: { consensusScore: claim.consensusScore, consensusCount: claim.consensusCount, disagreementCount: claim.disagreementCount, lastComputedAt: claim.lastComputedAt } };
      }
    }
    claim.status = 'accepted';
    this.audits.unshift({ auditId: crypto.randomUUID(), timestamp: now(), action: 'claim_accepted', actorUserId: actor.userId, actorRole: actor.role, entity: 'claim', entityId: claim.claimId, diff: { entity: 'card', oldValues: {}, newValues: { claimId: claim.claimId } }, notes: auto ? 'auto-accepted by consensus policy' : undefined });
  }

  getConsensusQueue(session: AuthSession) {
    this.requireRole(session, 'moderator');
    return this.claims.filter((c) => c.status === 'open').sort((a, b) => b.consensusScore - a.consensusScore);
  }

  setClaimStatus(session: AuthSession, claimId: string, action: 'accepted' | 'rejected' | 'superseded') {
    this.requireRole(session, 'moderator');
    const claim = this.claims.find((c) => c.claimId === claimId);
    if (!claim) throw new Error('claim missing');
    if (action === 'accepted') this.applyClaim(claim, session);
    else {
      claim.status = action;
      this.audits.unshift({ auditId: crypto.randomUUID(), timestamp: now(), action: action === 'rejected' ? 'claim_rejected' : 'claim_superseded', actorUserId: session.userId, actorRole: session.role, entity: 'claim', entityId: claim.claimId, diff: { entity: 'card', oldValues: {}, newValues: {} } });
    }
  }

  getObservationsForClaim(session: AuthSession, claimId: string) {
    this.requireRole(session, 'moderator');
    const claim = this.claims.find((c) => c.claimId === claimId);
    if (!claim) return [];
    return this.observations.filter((o) => claim.generatedFrom.includes(o.observationId));
  }

  getProposals(session: AuthSession, status: ModerationProposal['status'] = 'new') { this.requireRole(session, 'moderator'); return this.proposals.filter((p) => p.status === status || (status === 'new' && p.status === 'reviewing')); }
  approve(session: AuthSession, proposalId: string, note?: string) { this.requireRole(session, 'moderator'); const proposal = this.proposals.find((p) => p.proposalId === proposalId); if (!proposal) throw new Error('Not found'); const diff = proposal.payload.diff; if (diff.entity === 'card' && diff.entityId) { const card = this.cards.find((c) => c.id === diff.entityId); if (!card) throw new Error('Card missing'); const next = { ...card, ...diff.newValues } as Card; const e = validateCard(next); if (e.length) throw new Error(e.join(', ')); Object.assign(card, { ...next, version: card.version + 1, updatedAt: now() }); } if (diff.entity === 'print' && diff.entityId) { const print = this.prints.find((p) => p.printId === diff.entityId); if (!print) throw new Error('Print missing'); const next = { ...print, ...diff.newValues } as Print; const e = validatePrint(next); if (e.length) throw new Error(e.join(', ')); Object.assign(print, { ...next, version: print.version + 1, updatedAt: now() }); } proposal.status = 'accepted'; proposal.reviewedAt = now(); proposal.reviewedBy = session.userId; proposal.reviewerNotes = note; this.audits.unshift({ auditId: crypto.randomUUID(), timestamp: now(), proposalId, action: 'accepted', actorUserId: session.userId, actorRole: session.role, entity: diff.entity, entityId: diff.entityId ?? 'new', diff, notes: note }); }
  reject(session: AuthSession, proposalId: string, note?: string) { this.requireRole(session, 'moderator'); const p = this.proposals.find((x) => x.proposalId === proposalId); if (!p) throw new Error('Not found'); p.status = 'rejected'; p.reviewedAt = now(); p.reviewedBy = session.userId; p.reviewerNotes = note; this.audits.unshift({ auditId: crypto.randomUUID(), timestamp: now(), proposalId, action: 'rejected', actorUserId: session.userId, actorRole: session.role, entity: p.payload.diff.entity, entityId: p.payload.diff.entityId ?? 'new', diff: p.payload.diff, notes: note }); }
  adminEditCard(session: AuthSession, card: Card, note?: string) { this.requireRole(session, 'admin'); const existing = this.cards.find((c) => c.id === card.id); if (!existing) throw new Error('Card not found'); const e = validateCard(card); if (e.length) throw new Error(e.join(', ')); const oldValues = { ...existing }; Object.assign(existing, { ...card, version: existing.version + 1, updatedAt: now() }); this.cardVersions.set(existing.id, [...(this.cardVersions.get(existing.id) ?? []), structuredClone(existing)]); this.audits.unshift({ auditId: crypto.randomUUID(), timestamp: now(), action: 'admin_edit', actorUserId: session.userId, actorRole: session.role, entity: 'card', entityId: card.id, diff: { entity: 'card', entityId: card.id, oldValues, newValues: { ...existing } }, notes: note }); }
  rollbackCard(session: AuthSession, cardId: string, toVersion: number) { this.requireRole(session, 'admin'); const versions = this.cardVersions.get(cardId) ?? []; const target = versions.find((v) => v.version === toVersion); const current = this.cards.find((c) => c.id === cardId); if (!target || !current) throw new Error('Rollback target missing'); const oldValues = { ...current }; Object.assign(current, { ...target, version: oldValues.version + 1, updatedAt: now() }); versions.push(structuredClone(current)); this.audits.unshift({ auditId: crypto.randomUUID(), timestamp: now(), action: 'rollback', actorUserId: session.userId, actorRole: session.role, entity: 'card', entityId: cardId, diff: { entity: 'card', entityId: cardId, oldValues, newValues: { ...current } }, notes: `Rollback to version ${toVersion}` }); }
  getAudit(session: AuthSession) { this.requireRole(session, 'moderator'); return this.audits; }
  getCardHistory(session: AuthSession, cardId: string) { this.requireRole(session, 'moderator'); return this.audits.filter((a) => a.entity === 'card' && a.entityId === cardId); }
  getTrustStats(session: AuthSession): UserTrustStats[] { this.requireRole(session, 'moderator'); return [...this.trust.values()].map((v) => ({ userId: v.principalId, acceptedCount: v.acceptedCount, rejectedCount: v.rejectedCount, rejectionRate: v.rejectedCount / Math.max(1, v.acceptedCount + v.rejectedCount), trustScore: Math.round(v.reputationScore * 100) })); }

  downloadSnapshot(session: AuthSession) {
    this.requireRole(session, 'viewer');
    const payload = { appVersion: '0.3.0', schemaVersion: 3, exportedAt: now(), cache_cards: this.cards.filter((c) => !c.deprecatedAt), cache_prints: this.prints.filter((p) => !p.deprecatedAt), cache_aliases: this.aliases, claims: this.claims, user_collection: [], user_scans: [], outbox_proposals: [], outbox_observations: [], sync_state: this.pullUpdates(session).syncState };
    return { ...payload, checksum: `sha256-${btoa(JSON.stringify(payload)).slice(0, 16)}` };
  }

  private checkRate(deviceId: string): string | undefined { const list = this.hourlyRate.get(deviceId) ?? []; const cutoff = Date.now() - 60 * 60 * 1000; const recent = list.filter((x) => x > cutoff); if (recent.length >= 30) return 'Rate limit exceeded: max 30 proposals/hour/device'; recent.push(Date.now()); this.hourlyRate.set(deviceId, recent); return undefined; }
  private isFlaggedContributor(userId: string): boolean { const stats = this.proposals.filter((p) => p.userId === userId && (p.status === 'accepted' || p.status === 'rejected')); if (stats.length < 5) return false; const rejected = stats.filter((s) => s.status === 'rejected').length; return rejected / stats.length > 0.6; }
}

export const mockServer = new MockCentralServer();
