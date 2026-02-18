import { mockServer } from './mockServer';
import type { AuthSession } from '../core/types';
import type { IModerationService } from './interfaces';

export class MockModerationService implements IModerationService {
  async getPendingProposals(session: AuthSession, filter?: { type?: string; userId?: string; minConfidence?: number }) {
    const base = mockServer.getProposals(session, 'new');
    return base.filter((p) => {
      if (filter?.type && p.type !== filter.type) return false;
      if (filter?.userId && p.userId !== filter.userId) return false;
      if (filter?.minConfidence !== undefined && (p.payload.confidence ?? 0) < filter.minConfidence) return false;
      return true;
    });
  }

  async getAuditLog(session: AuthSession) {
    return mockServer.getAudit(session);
  }

  async getTrustStats(session: AuthSession) {
    return mockServer.getTrustStats(session);
  }

  async getCardHistory(session: AuthSession, cardId: string) {
    return mockServer.getCardHistory(session, cardId);
  }

  async approveProposal(session: AuthSession, proposalId: string, note?: string) {
    mockServer.approve(session, proposalId, note);
  }

  async rejectProposal(session: AuthSession, proposalId: string, note?: string) {
    mockServer.reject(session, proposalId, note);
  }

  async rollbackCard(session: AuthSession, cardId: string, toVersion: number) {
    mockServer.rollbackCard(session, cardId, toVersion);
  }

  async adminEditCard(session: AuthSession, card: any, note?: string) {
    mockServer.adminEditCard(session, card, note);
  }
}
