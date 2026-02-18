import type { AuthSession, OutboxDraft, OutboxObservation, OutboxProposal } from '../core/types';
import { mockServer } from './mockServer';
import type { ISyncService } from './interfaces';

export class MockSyncService implements ISyncService {
  async pullUpdates(session: AuthSession) { return mockServer.pullUpdates(session); }
  async pushProposals(session: AuthSession, proposals: OutboxProposal[]) { return mockServer.submitProposals(session, proposals); }
  async pushObservations(session: AuthSession, observations: OutboxObservation[]) { return mockServer.submitObservations(session, observations); }
  async pushDrafts(session: AuthSession, drafts: OutboxDraft[]) { return mockServer.submitDrafts(session, drafts); }
  async downloadSnapshotBundle(session: AuthSession) { return mockServer.downloadSnapshot(session); }
}

export class HttpSyncService implements ISyncService {
  constructor(private baseUrl: string) {}
  async pullUpdates(session: AuthSession) { const res = await fetch(`${this.baseUrl}/sync/pull`, { headers: { Authorization: `Bearer ${session.token}` } }); if (!res.ok) throw new Error('Failed pull'); return await res.json(); }
  async pushProposals(session: AuthSession, proposals: OutboxProposal[]) { const res = await fetch(`${this.baseUrl}/proposals`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ proposals }) }); if (!res.ok) throw new Error('Failed push'); return await res.json(); }
  async pushObservations(session: AuthSession, observations: OutboxObservation[]) { const res = await fetch(`${this.baseUrl}/observations`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ observations }) }); if (!res.ok) throw new Error('Failed observations push'); return await res.json(); }
  async pushDrafts(session: AuthSession, drafts: OutboxDraft[]) { const res = await fetch(`${this.baseUrl}/drafts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` }, body: JSON.stringify({ drafts }) }); if (!res.ok) throw new Error('Failed drafts push'); return await res.json(); }
  async downloadSnapshotBundle(session: AuthSession) { const res = await fetch(`${this.baseUrl}/snapshot/latest`, { headers: { Authorization: `Bearer ${session.token}` } }); if (!res.ok) throw new Error('Failed snapshot download'); return await res.json(); }
}
