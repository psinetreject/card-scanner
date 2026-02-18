import { mockServer } from './mockServer';
import type { AuthSession, Card } from '../core/types';
import type { IModerationService } from './interfaces';

export class MockModerationService implements IModerationService {
  async getPendingProposals(session: AuthSession, filter?: { type?: string; userId?: string; minConfidence?: number }) {
    const base = mockServer.getProposals(session, 'new');
    return base.filter((p) => (!filter?.type || p.type === filter.type) && (!filter?.userId || p.userId === filter.userId) && (filter?.minConfidence === undefined || (p.payload.confidence ?? 0) >= filter.minConfidence));
  }
  async getAuditLog(session: AuthSession) { return mockServer.getAudit(session); }
  async getTrustStats(session: AuthSession) { return mockServer.getTrustStats(session); }
  async getCardHistory(session: AuthSession, cardId: string) { return mockServer.getCardHistory(session, cardId); }
  async approveProposal(session: AuthSession, proposalId: string, note?: string) { mockServer.approve(session, proposalId, note); }
  async rejectProposal(session: AuthSession, proposalId: string, note?: string) { mockServer.reject(session, proposalId, note); }
  async rollbackCard(session: AuthSession, cardId: string, toVersion: number) { mockServer.rollbackCard(session, cardId, toVersion); }
  async adminEditCard(session: AuthSession, card: Card, note?: string) { mockServer.adminEditCard(session, card, note); }
  async getConsensusQueue(session: AuthSession) { return mockServer.getConsensusQueue(session); }
  async setClaimStatus(session: AuthSession, claimId: string, action: 'accepted' | 'rejected' | 'superseded', _note?: string) { mockServer.setClaimStatus(session, claimId, action); }
  async getObservationsForClaim(session: AuthSession, claimId: string) { return mockServer.getObservationsForClaim(session, claimId); }
  async getDraftQueue(session: AuthSession) { return mockServer.getDraftQueue(session); }
  async markDraftReviewing(session: AuthSession, draftId: string) { mockServer.markDraftReviewing(session, draftId); }
  async publishDraft(session: AuthSession, draftId: string, editedPayload?: Record<string, unknown>) { mockServer.publishDraft(session, draftId, editedPayload); }
  async rejectDraft(session: AuthSession, draftId: string, note?: string) { mockServer.rejectDraft(session, draftId, note); }
  async requestDraftChanges(session: AuthSession, draftId: string, note?: string) { mockServer.requestDraftChanges(session, draftId, note); }
  async getPublishEvents(session: AuthSession) { return mockServer.getPublishEvents(session); }
}
