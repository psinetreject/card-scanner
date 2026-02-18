import type {
  AuditLogEntry,
  AuthSession,
  Card,
  ModerationProposal,
  OutboxProposal,
  Print,
  Role,
  UserTrustStats,
} from '../core/types';
import { validateCard, validatePrint, validateProposalPayload } from '../core/validation';
import { seedAliases, seedCards, seedPrints } from '../data/seed';

const rolePriority: Role[] = ['viewer', 'contributor', 'moderator', 'admin'];
const now = () => new Date().toISOString();

class MockCentralServer {
  private cards: Card[] = structuredClone(seedCards);
  private prints: Print[] = structuredClone(seedPrints);
  private aliases = structuredClone(seedAliases);
  private proposals: ModerationProposal[] = [];
  private audits: AuditLogEntry[] = [];
  private cardVersions = new Map<string, Card[]>(this.cards.map((c) => [c.id, [structuredClone(c)]]));
  private hourlyRate = new Map<string, number[]>();

  requireRole(session: AuthSession, minimum: Role) {
    if (rolePriority.indexOf(session.role) < rolePriority.indexOf(minimum)) throw new Error('Forbidden');
  }

  login(role: Role): AuthSession {
    return {
      token: `mock-${role}-${Math.random().toString(36).slice(2)}`,
      userId: `${role}-user`,
      deviceId: `device-${Math.random().toString(36).slice(2, 9)}`,
      role,
    };
  }

  pullUpdates(session: AuthSession) {
    this.requireRole(session, 'viewer');
    return {
      cards: this.cards.filter((c) => !c.deprecatedAt),
      prints: this.prints.filter((p) => !p.deprecatedAt),
      aliases: this.aliases,
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
    const acceptedIds: string[] = [];
    const failed: { id: string; error: string }[] = [];
    for (const proposal of proposals) {
      const rateError = this.checkRate(session.deviceId);
      if (rateError) {
        failed.push({ id: proposal.localProposalId, error: rateError });
        continue;
      }
      const validationErrors = validateProposalPayload(proposal.payload);
      if (validationErrors.length > 0) {
        failed.push({ id: proposal.localProposalId, error: validationErrors.join(', ') });
        continue;
      }
      const flagged = this.isFlaggedContributor(session.userId);
      this.proposals.push({
        proposalId: proposal.localProposalId,
        createdAt: proposal.createdAt,
        createdByDeviceId: session.deviceId,
        userId: session.userId,
        type: proposal.type,
        payload: proposal.payload,
        status: flagged ? 'reviewing' : 'new',
        flagged,
      });
      acceptedIds.push(proposal.localProposalId);
    }
    return { acceptedIds, failed };
  }

  getProposals(session: AuthSession, status: ModerationProposal['status'] = 'new') {
    this.requireRole(session, 'moderator');
    return this.proposals.filter((p) => p.status === status || (status === 'new' && p.status === 'reviewing'));
  }

  approve(session: AuthSession, proposalId: string, note?: string) {
    this.requireRole(session, 'moderator');
    const proposal = this.proposals.find((p) => p.proposalId === proposalId);
    if (!proposal) throw new Error('Not found');

    const diff = proposal.payload.diff;
    if (diff.entity === 'card' && diff.entityId) {
      const card = this.cards.find((c) => c.id === diff.entityId);
      if (!card) throw new Error('Card missing');
      const next = { ...card, ...diff.newValues } as Card;
      const cardErrors = validateCard(next);
      if (cardErrors.length) throw new Error(cardErrors.join(', '));
      next.version = card.version + 1;
      next.updatedAt = now();
      Object.assign(card, next);
      this.cardVersions.set(card.id, [...(this.cardVersions.get(card.id) ?? []), structuredClone(card)]);
    }

    if (diff.entity === 'print' && diff.entityId) {
      const print = this.prints.find((p) => p.printId === diff.entityId);
      if (!print) throw new Error('Print missing');
      const next = { ...print, ...diff.newValues } as Print;
      const printErrors = validatePrint(next);
      if (printErrors.length) throw new Error(printErrors.join(', '));
      next.version = print.version + 1;
      next.updatedAt = now();
      Object.assign(print, next);
    }

    proposal.status = 'accepted';
    proposal.reviewedAt = now();
    proposal.reviewedBy = session.userId;
    proposal.reviewerNotes = note;

    this.audits.unshift({
      auditId: crypto.randomUUID(),
      timestamp: now(),
      proposalId,
      action: 'accepted',
      actorUserId: session.userId,
      actorRole: session.role,
      entity: diff.entity,
      entityId: diff.entityId ?? 'new',
      diff,
      notes: note,
    });
  }

  reject(session: AuthSession, proposalId: string, note?: string) {
    this.requireRole(session, 'moderator');
    const proposal = this.proposals.find((p) => p.proposalId === proposalId);
    if (!proposal) throw new Error('Not found');
    proposal.status = 'rejected';
    proposal.reviewedAt = now();
    proposal.reviewedBy = session.userId;
    proposal.reviewerNotes = note;
    this.audits.unshift({
      auditId: crypto.randomUUID(),
      timestamp: now(),
      proposalId,
      action: 'rejected',
      actorUserId: session.userId,
      actorRole: session.role,
      entity: proposal.payload.diff.entity,
      entityId: proposal.payload.diff.entityId ?? 'new',
      diff: proposal.payload.diff,
      notes: note,
    });
  }

  adminEditCard(session: AuthSession, card: Card, note?: string) {
    this.requireRole(session, 'admin');
    const existing = this.cards.find((c) => c.id === card.id);
    if (!existing) throw new Error('Card not found');
    const errors = validateCard(card);
    if (errors.length) throw new Error(errors.join(', '));
    const oldValues = { ...existing };
    Object.assign(existing, { ...card, version: existing.version + 1, updatedAt: now() });
    this.cardVersions.set(existing.id, [...(this.cardVersions.get(existing.id) ?? []), structuredClone(existing)]);
    this.audits.unshift({
      auditId: crypto.randomUUID(),
      timestamp: now(),
      action: 'admin_edit',
      actorUserId: session.userId,
      actorRole: session.role,
      entity: 'card',
      entityId: card.id,
      diff: { entity: 'card', entityId: card.id, oldValues, newValues: { ...existing } },
      notes: note,
    });
  }

  rollbackCard(session: AuthSession, cardId: string, toVersion: number) {
    this.requireRole(session, 'admin');
    const versions = this.cardVersions.get(cardId) ?? [];
    const target = versions.find((v) => v.version === toVersion);
    const current = this.cards.find((c) => c.id === cardId);
    if (!target || !current) throw new Error('Rollback target missing');
    const oldValues = { ...current };
    Object.assign(current, { ...target, version: oldValues.version + 1, updatedAt: now() });
    versions.push(structuredClone(current));
    this.audits.unshift({
      auditId: crypto.randomUUID(),
      timestamp: now(),
      action: 'rollback',
      actorUserId: session.userId,
      actorRole: session.role,
      entity: 'card',
      entityId: cardId,
      diff: { entity: 'card', entityId: cardId, oldValues, newValues: { ...current } },
      notes: `Rollback to version ${toVersion}`,
    });
  }

  getAudit(session: AuthSession) {
    this.requireRole(session, 'moderator');
    return this.audits;
  }

  getCardHistory(session: AuthSession, cardId: string) {
    this.requireRole(session, 'moderator');
    return this.audits.filter((a) => a.entity === 'card' && a.entityId === cardId);
  }

  getTrustStats(session: AuthSession): UserTrustStats[] {
    this.requireRole(session, 'moderator');
    const byUser = new Map<string, { accepted: number; rejected: number }>();
    for (const p of this.proposals) {
      if (!p.userId) continue;
      const current = byUser.get(p.userId) ?? { accepted: 0, rejected: 0 };
      if (p.status === 'accepted') current.accepted += 1;
      if (p.status === 'rejected') current.rejected += 1;
      byUser.set(p.userId, current);
    }

    return [...byUser.entries()].map(([userId, v]) => {
      const total = v.accepted + v.rejected;
      const rejectionRate = total ? v.rejected / total : 0;
      return {
        userId,
        acceptedCount: v.accepted,
        rejectedCount: v.rejected,
        rejectionRate,
        trustScore: Math.max(0, Math.round((1 - rejectionRate) * 100)),
      };
    });
  }

  downloadSnapshot(session: AuthSession) {
    this.requireRole(session, 'viewer');
    const payload = {
      appVersion: '0.2.0',
      schemaVersion: 2,
      exportedAt: now(),
      cache_cards: this.cards.filter((c) => !c.deprecatedAt),
      cache_prints: this.prints.filter((p) => !p.deprecatedAt),
      cache_aliases: this.aliases,
      user_collection: [],
      user_scans: [],
      outbox_proposals: [],
      sync_state: this.pullUpdates(session).syncState,
    };
    return { ...payload, checksum: `sha256-${btoa(JSON.stringify(payload)).slice(0, 16)}` };
  }

  private checkRate(deviceId: string): string | undefined {
    const list = this.hourlyRate.get(deviceId) ?? [];
    const cutoff = Date.now() - 60 * 60 * 1000;
    const recent = list.filter((x) => x > cutoff);
    if (recent.length >= 30) return 'Rate limit exceeded: max 30 proposals/hour/device';
    recent.push(Date.now());
    this.hourlyRate.set(deviceId, recent);
    return undefined;
  }

  private isFlaggedContributor(userId: string): boolean {
    const stats = this.proposals.filter((p) => p.userId === userId && (p.status === 'accepted' || p.status === 'rejected'));
    if (stats.length < 5) return false;
    const rejected = stats.filter((s) => s.status === 'rejected').length;
    return rejected / stats.length > 0.6;
  }
}

export const mockServer = new MockCentralServer();
