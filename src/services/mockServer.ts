import type {
  AuditLogEntry,
  AuthSession,
  Card,
  Claim,
  Draft,
  DraftStatusCache,
  ModerationProposal,
  Observation,
  OutboxDraft,
  OutboxObservation,
  OutboxProposal,
  Print,
  PublishEvent,
  Role,
  TrustProfile,
  UserTrustStats,
} from '../core/types';
import { validateCard, validatePrint, validateProposalPayload } from '../core/validation';
import { seedAliases, seedCards, seedFeaturePacks, seedImageFeatures, seedPrints } from '../data/seed';

const rolePriority: Role[] = ['guest', 'viewer', 'contributor', 'moderator', 'admin'];
const now = () => new Date().toISOString();
const norm = (v: string | number) => String(v).trim().toLowerCase();

class MockCentralServer {
  private cards: Card[] = structuredClone(seedCards);
  private prints: Print[] = structuredClone(seedPrints);
  private aliases = structuredClone(seedAliases);
  private imageFeatures = structuredClone(seedImageFeatures);
  private featurePacks = structuredClone(seedFeaturePacks);
  private proposals: ModerationProposal[] = [];
  private audits: AuditLogEntry[] = [];
  private claims: Claim[] = [];
  private observations: Observation[] = [];
  private drafts: Draft[] = [];
  private publishEvents: PublishEvent[] = [];
  private draftStatuses: DraftStatusCache[] = [];
  private trust = new Map<string, TrustProfile>();
  private cardVersions = new Map<string, Card[]>(this.cards.map((c) => [c.id, [structuredClone(c)]]));
  private hourlyRate = new Map<string, number[]>();

  private requireRole(session: AuthSession, minimum: Role) {
    if (rolePriority.indexOf(session.role) < rolePriority.indexOf(minimum)) throw new Error('Forbidden');
  }

  login(role: Role, username?: string): AuthSession {
    const id = username || `${role}-user`;
    if (!this.trust.has(id)) this.trust.set(id, { principalId: id, createdAt: now(), lastUpdatedAt: now(), reputationScore: role === 'guest' ? 0.2 : 0.7, acceptedCount: 0, rejectedCount: 0, spamFlagCount: 0 });
    return { token: `mock-${role}-${Math.random().toString(36).slice(2)}`, username: id, userId: id, deviceId: `device-${Math.random().toString(36).slice(2, 9)}`, role };
  }

  pullUpdates(session: AuthSession) {
    this.requireRole(session, 'viewer');
    return {
      cards: this.cards.filter((c) => !c.deprecatedAt),
      prints: this.prints.filter((p) => !p.deprecatedAt),
      aliases: this.aliases,
      imageFeatures: this.imageFeatures.filter((f: any) => this.featurePacks.some((p: any) => p.packId === f.packId && p.status === 'installed')),
      featurePacks: this.featurePacks,
      claims: this.claims,
      draftStatuses: this.draftStatuses.filter((d) => d.draftId.includes(session.userId) || session.role === 'moderator' || session.role === 'admin'),
      syncState: {
        lastSyncAt: now(),
        lastCardsVersion: Math.max(0, ...this.cards.map((c) => c.version)),
        lastPrintsVersion: Math.max(0, ...this.prints.map((p) => p.version)),
        lastAliasesVersion: Math.max(0, ...this.aliases.map((a) => a.version)),
        lastImagesVersion: 0,
      },
    };
  }

  submitProposals(session: AuthSession, proposals: OutboxProposal[]) {
    this.requireRole(session, 'contributor');
    if (session.role === 'guest') throw new Error('Guest cannot submit');
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
    if (session.role === 'guest') throw new Error('Guest cannot submit');
    const acceptedIds: string[] = [];
    const failed: { id: string; error: string }[] = [];
    for (const ob of observations) {
      if (!ob.targetType || !ob.targetId) { failed.push({ id: ob.localObservationId, error: 'targetType/targetId required' }); continue; }
      const existsRecent = this.observations.find((x) => x.principalId === session.userId && x.fieldPath === ob.fieldPath && (x.cardId === ob.targetId || x.printId === ob.targetId) && Date.now() - new Date(x.createdAt).getTime() < 24 * 60 * 60 * 1000);
      if (existsRecent) continue;
      this.observations.push({ observationId: ob.localObservationId, createdAt: ob.createdAt, principalId: session.userId, scanRef: ob.scanRef, cardId: ob.targetType === 'card' ? ob.targetId : undefined, printId: ob.targetType === 'print' ? ob.targetId : undefined, fieldPath: ob.fieldPath, value: ob.value, valueNorm: norm(ob.value), ocrConfidence: ob.ocrConfidence, captureQualityScore: ob.captureQualityScore, status: 'active' });
      acceptedIds.push(ob.localObservationId);
    }
    this.recomputeClaims();
    return { acceptedIds, failed };
  }

  submitDrafts(session: AuthSession, drafts: OutboxDraft[]) {
    this.requireRole(session, 'contributor');
    if (session.role === 'guest') throw new Error('Guest cannot submit');
    const acceptedIds: string[] = [];
    const failed: { id: string; error: string }[] = [];
    for (const d of drafts) {
      if (!d.proposedPayload || Object.keys(d.proposedPayload).length === 0) { failed.push({ id: d.localDraftId, error: 'Missing proposed payload' }); continue; }
      const draftId = `${session.userId}-${d.localDraftId}`;
      this.drafts.push({ draftId, createdAt: d.createdAt, createdBy: session.userId, sourceScanRef: d.sourceScanId, targetType: d.targetType, targetId: d.targetId, extractedFields: d.extractedFields, proposedPayload: d.proposedPayload, visualFeatures: d.visualFeatures, evidenceImageThumb: d.evidenceImageThumb, status: 'new' });
      this.draftStatuses.push({ draftId, status: 'new', updatedAt: now() });
      acceptedIds.push(d.localDraftId);
    }
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
        const rep = this.trust.get(ob.principalId)?.reputationScore ?? 0.5;
        const w = (0.5 + 0.5 * ob.ocrConfidence) * (0.6 + 0.4 * ob.captureQualityScore) * (0.5 + 0.5 * rep);
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
      const disagreementCount = ranked.slice(1).reduce((acc, x) => acc + x[1].principalSet.size, 0);
      let claim = this.claims.find((c) => c.targetType === targetType && c.targetId === targetId && c.fieldPath === fieldPath && c.status === 'open');
      if (!claim) {
        claim = { claimId: crypto.randomUUID(), createdAt: now(), targetType: targetType as 'card' | 'print', targetId, fieldPath, proposedValue: winner[1].value, proposedValueNorm: winner[0], generatedFrom: winner[1].obsIds, status: 'open', consensusScore, consensusCount, disagreementCount, lastComputedAt: now(), competingValues: [] };
        this.claims.push(claim);
      }
      claim.proposedValue = winner[1].value;
      claim.proposedValueNorm = winner[0];
      claim.generatedFrom = winner[1].obsIds;
      claim.consensusScore = consensusScore;
      claim.consensusCount = consensusCount;
      claim.disagreementCount = disagreementCount;
      claim.lastComputedAt = now();
      claim.competingValues = ranked.map(([valueNorm, v]) => ({ valueNorm, totalWeight: v.totalWeight, principals: v.principalSet.size }));
      if (claim.status === 'open' && consensusScore >= 0.85 && consensusCount >= 3 && disagreementCount <= 1) this.applyClaim(claim, { userId: 'system', username: 'system', role: 'admin', token: 'sys', deviceId: 'sys' }, true);
    }
  }

  private applyClaim(claim: Claim, actor: AuthSession, auto = false) {
    if (claim.targetType === 'card') {
      const card = this.cards.find((c) => c.id === claim.targetId);
      if (card) {
        Object.assign(card, { [claim.fieldPath.replace('cards.', '')]: claim.proposedValue, version: card.version + 1, updatedAt: now() });
        card.consensus = { ...(card.consensus ?? {}), [claim.fieldPath]: { consensusScore: claim.consensusScore, consensusCount: claim.consensusCount, disagreementCount: claim.disagreementCount, lastComputedAt: claim.lastComputedAt } };
      }
    }
    if (claim.targetType === 'print') {
      const print = this.prints.find((p) => p.printId === claim.targetId);
      if (print) {
        Object.assign(print, { [claim.fieldPath.replace('prints.', '')]: claim.proposedValue, version: print.version + 1, updatedAt: now() });
        print.consensus = { ...(print.consensus ?? {}), [claim.fieldPath]: { consensusScore: claim.consensusScore, consensusCount: claim.consensusCount, disagreementCount: claim.disagreementCount, lastComputedAt: claim.lastComputedAt } };
      }
    }
    claim.status = 'accepted';
    this.audits.unshift({ auditId: crypto.randomUUID(), timestamp: now(), action: 'claim_accepted', actorUserId: actor.userId, actorRole: actor.role, entity: 'claim', entityId: claim.claimId, diff: { entity: 'card', oldValues: {}, newValues: { claimId: claim.claimId } }, notes: auto ? 'auto-accepted by consensus policy' : undefined });
  }

  getConsensusQueue(session: AuthSession) { this.requireRole(session, 'moderator'); return this.claims.filter((c) => c.status === 'open').sort((a, b) => b.consensusScore - a.consensusScore); }
  setClaimStatus(session: AuthSession, claimId: string, action: 'accepted' | 'rejected' | 'superseded') { this.requireRole(session, 'moderator'); const claim = this.claims.find((c) => c.claimId === claimId); if (!claim) throw new Error('claim missing'); if (action === 'accepted') this.applyClaim(claim, session); else claim.status = action; }
  getObservationsForClaim(session: AuthSession, claimId: string) { this.requireRole(session, 'moderator'); const claim = this.claims.find((c) => c.claimId === claimId); if (!claim) return []; return this.observations.filter((o) => claim.generatedFrom.includes(o.observationId)); }

  getDraftQueue(session: AuthSession) { this.requireRole(session, 'moderator'); return this.drafts.filter((d) => d.status === 'new' || d.status === 'reviewing'); }
  markDraftReviewing(session: AuthSession, draftId: string) { this.requireRole(session, 'moderator'); const d = this.drafts.find((x) => x.draftId === draftId); if (!d) throw new Error('Draft not found'); d.status = 'reviewing'; this.draftStatuses.push({ draftId, status: 'reviewing', updatedAt: now() }); }
  publishDraft(session: AuthSession, draftId: string, editedPayload?: Record<string, unknown>) {
    this.requireRole(session, 'moderator');
    const d = this.drafts.find((x) => x.draftId === draftId);
    if (!d) throw new Error('Draft not found');
    const payload = editedPayload ?? d.proposedPayload;
    const results: string[] = [];
    if (d.targetType === 'card' || d.targetType === 'unknown') {
      const target = d.targetId ? this.cards.find((c) => c.id === d.targetId) : undefined;
      if (target) {
        const next = { ...target, ...payload } as Card;
        const errs = validateCard(next); if (errs.length) throw new Error(errs.join(', '));
        Object.assign(target, next, { version: target.version + 1, updatedAt: now() });
        results.push(target.id);
      } else {
        const card: Card = { id: `c${this.cards.length + 1}`, name: String(payload.name ?? 'Unknown Card'), type: String(payload.type ?? 'Monster'), text: String(payload.text ?? ''), updatedAt: now(), version: 1, atk: Number(payload.atk ?? 0), def: Number(payload.def ?? 0) };
        const errs = validateCard(card); if (errs.length) throw new Error(errs.join(', '));
        this.cards.push(card); results.push(card.id);
      }
    }
    if (d.targetType === 'print') {
      const target = d.targetId ? this.prints.find((p) => p.printId === d.targetId) : undefined;
      if (target) {
        const next = { ...target, ...payload } as Print;
        const errs = validatePrint(next); if (errs.length) throw new Error(errs.join(', '));
        Object.assign(target, next, { version: target.version + 1, updatedAt: now() });
        results.push(target.printId);
      }
    }
    d.status = 'published';
    d.proposedPayload = payload;
    d.publishedAt = now();
    d.publishedBy = session.userId;
    this.draftStatuses.push({ draftId: d.draftId, status: 'published', updatedAt: now() });
    this.publishEvents.unshift({ eventId: crypto.randomUUID(), draftId: d.draftId, timestamp: now(), action: 'publish', actorRole: session.role, actorId: session.userId, diffApplied: payload, resultingTargetIds: results });
  }
  rejectDraft(session: AuthSession, draftId: string, note?: string) { this.requireRole(session, 'moderator'); const d = this.drafts.find((x) => x.draftId === draftId); if (!d) throw new Error('Draft not found'); d.status = 'rejected'; d.reviewNotes = note; this.draftStatuses.push({ draftId, status: 'rejected', updatedAt: now(), reviewNotes: note }); this.publishEvents.unshift({ eventId: crypto.randomUUID(), draftId, timestamp: now(), action: 'reject', actorRole: session.role, actorId: session.userId, diffApplied: {}, resultingTargetIds: [] }); }
  requestDraftChanges(session: AuthSession, draftId: string, note?: string) { this.requireRole(session, 'moderator'); const d = this.drafts.find((x) => x.draftId === draftId); if (!d) throw new Error('Draft not found'); d.status = 'request_changes'; d.reviewNotes = note; this.draftStatuses.push({ draftId, status: 'request_changes', updatedAt: now(), reviewNotes: note }); this.publishEvents.unshift({ eventId: crypto.randomUUID(), draftId, timestamp: now(), action: 'request_changes', actorRole: session.role, actorId: session.userId, diffApplied: {}, resultingTargetIds: [] }); }
  getPublishEvents(session: AuthSession) { this.requireRole(session, 'moderator'); return this.publishEvents; }

  getProposals(session: AuthSession, status: ModerationProposal['status'] = 'new') { this.requireRole(session, 'moderator'); return this.proposals.filter((p) => p.status === status || (status === 'new' && p.status === 'reviewing')); }
  approve(session: AuthSession, proposalId: string, note?: string) { this.requireRole(session, 'moderator'); const proposal = this.proposals.find((p) => p.proposalId === proposalId); if (!proposal) throw new Error('Not found'); const diff = proposal.payload.diff; if (diff.entity === 'card' && diff.entityId) { const card = this.cards.find((c) => c.id === diff.entityId); if (!card) throw new Error('Card missing'); const next = { ...card, ...diff.newValues } as Card; const e = validateCard(next); if (e.length) throw new Error(e.join(', ')); Object.assign(card, { ...next, version: card.version + 1, updatedAt: now() }); } if (diff.entity === 'print' && diff.entityId) { const print = this.prints.find((p) => p.printId === diff.entityId); if (!print) throw new Error('Print missing'); const next = { ...print, ...diff.newValues } as Print; const e = validatePrint(next); if (e.length) throw new Error(e.join(', ')); Object.assign(print, { ...next, version: print.version + 1, updatedAt: now() }); } proposal.status = 'accepted'; proposal.reviewedAt = now(); proposal.reviewedBy = session.userId; proposal.reviewerNotes = note; }
  reject(session: AuthSession, proposalId: string, note?: string) { this.requireRole(session, 'moderator'); const p = this.proposals.find((x) => x.proposalId === proposalId); if (!p) throw new Error('Not found'); p.status = 'rejected'; p.reviewedAt = now(); p.reviewedBy = session.userId; p.reviewerNotes = note; }
  adminEditCard(session: AuthSession, card: Card, _note?: string) { this.requireRole(session, 'admin'); const existing = this.cards.find((c) => c.id === card.id); if (!existing) throw new Error('Card not found'); const e = validateCard(card); if (e.length) throw new Error(e.join(', ')); Object.assign(existing, { ...card, version: existing.version + 1, updatedAt: now() }); this.cardVersions.set(existing.id, [...(this.cardVersions.get(existing.id) ?? []), structuredClone(existing)]); }
  rollbackCard(session: AuthSession, cardId: string, toVersion: number) { this.requireRole(session, 'admin'); const versions = this.cardVersions.get(cardId) ?? []; const target = versions.find((v) => v.version === toVersion); const current = this.cards.find((c) => c.id === cardId); if (!target || !current) throw new Error('Rollback target missing'); Object.assign(current, { ...target, version: current.version + 1, updatedAt: now() }); }
  getAudit(session: AuthSession) { this.requireRole(session, 'moderator'); return this.audits; }
  getCardHistory(session: AuthSession, cardId: string) { this.requireRole(session, 'moderator'); return this.audits.filter((a) => a.entity === 'card' && a.entityId === cardId); }
  getTrustStats(session: AuthSession): UserTrustStats[] { this.requireRole(session, 'moderator'); return [...this.trust.values()].map((v) => ({ userId: v.principalId, acceptedCount: v.acceptedCount, rejectedCount: v.rejectedCount, rejectionRate: v.rejectedCount / Math.max(1, v.acceptedCount + v.rejectedCount), trustScore: Math.round(v.reputationScore * 100) })); }

  downloadSnapshot(session: AuthSession) {
    this.requireRole(session, 'viewer');
    const payload = { appVersion: '0.5.0', schemaVersion: 5, exportedAt: now(), cache_cards: this.cards.filter((c) => !c.deprecatedAt), cache_prints: this.prints.filter((p) => !p.deprecatedAt), cache_aliases: this.aliases, cache_image_features: this.imageFeatures, feature_packs: this.featurePacks, claims: this.claims, draft_statuses: this.draftStatuses, user_collection: [], user_scans: [], outbox_proposals: [], outbox_observations: [], outbox_drafts: [], sync_state: this.pullUpdates(session).syncState };
    return { ...payload, checksum: `sha256-${btoa(JSON.stringify(payload)).slice(0, 16)}` };
  }

  private checkRate(deviceId: string): string | undefined { const list = this.hourlyRate.get(deviceId) ?? []; const cutoff = Date.now() - 60 * 60 * 1000; const recent = list.filter((x) => x > cutoff); if (recent.length >= 30) return 'Rate limit exceeded: max 30 writes/hour/device'; recent.push(Date.now()); this.hourlyRate.set(deviceId, recent); return undefined; }
  private isFlaggedContributor(userId: string): boolean { const stats = this.proposals.filter((p) => p.userId === userId && (p.status === 'accepted' || p.status === 'rejected')); if (stats.length < 5) return false; const rejected = stats.filter((s) => s.status === 'rejected').length; return rejected / stats.length > 0.6; }
}

export const mockServer = new MockCentralServer();
