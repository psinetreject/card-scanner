import { useEffect, useState } from 'react';
import { useServices } from '../hooks/useServices';

export function SyncPage() {
  const services = useServices();
  const [syncState, setSyncState] = useState<string>('Not synced yet');
  const [outboxCount, setOutboxCount] = useState(0);
  const [obsCount, setObsCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [message, setMessage] = useState('');

  const refresh = async () => {
    await services.storage.init();
    const [state, proposals, observations, drafts] = await Promise.all([
      services.storage.getSyncState(),
      services.storage.listProposals(),
      services.storage.listObservations(),
      services.storage.listDrafts(),
    ]);
    setSyncState(state.lastSyncAt ?? 'Never');
    setOutboxCount(proposals.filter((p) => p.status === 'queued').length);
    setObsCount(observations.filter((o) => o.status === 'queued').length);
    setDraftCount(drafts.filter((d) => d.status === 'queued').length);
  };

  useEffect(() => { refresh(); }, []);

  const requireSession = async () => {
    const session = await services.storage.getSession();
    if (!session) throw new Error('Not authenticated');
    return session;
  };

  const downloadUpdates = async () => {
    const session = await requireSession();
    const payload = await services.sync.pullUpdates(session);
    await services.storage.importSnapshot({
      appVersion: '0.4.0', schemaVersion: 4, exportedAt: new Date().toISOString(),
      cache_cards: payload.cards, cache_prints: payload.prints, cache_aliases: payload.aliases,
      claims: payload.claims, draft_statuses: payload.draftStatuses,
      user_collection: [], user_scans: [], outbox_proposals: [], outbox_observations: [], outbox_drafts: [],
      sync_state: payload.syncState,
    }, 'merge');
    for (const ds of payload.draftStatuses) await services.storage.setDraftStatusCache(ds);
    await services.storage.setSyncState(payload.syncState);
    setMessage('Pulled canonical + claim + draft status updates.');
    await refresh();
  };

  const uploadProposals = async () => {
    const session = await requireSession();
    if (session.role === 'guest' || session.role === 'viewer') return setMessage('Current role cannot upload proposals.');
    const queued = (await services.storage.listProposals()).filter((p) => p.status === 'queued');
    const result = await services.sync.pushProposals(session, queued);
    for (const id of result.acceptedIds) { const t = queued.find((x) => x.localProposalId === id); if (t) await services.storage.queueProposal({ ...t, status: 'sent' }); }
    for (const fail of result.failed) { const t = queued.find((x) => x.localProposalId === fail.id); if (t) await services.storage.queueProposal({ ...t, status: 'failed', lastError: fail.error }); }
    setMessage(`Proposals uploaded: ${result.acceptedIds.length}, failed: ${result.failed.length}`);
    await refresh();
  };

  const uploadObservations = async () => {
    const session = await requireSession();
    if (session.role === 'guest' || session.role === 'viewer') return setMessage('Current role cannot upload observations.');
    const queued = (await services.storage.listObservations()).filter((o) => o.status === 'queued');
    const result = await services.sync.pushObservations(session, queued);
    for (const id of result.acceptedIds) { const t = queued.find((x) => x.localObservationId === id); if (t) await services.storage.queueObservation({ ...t, status: 'sent' }); }
    for (const fail of result.failed) { const t = queued.find((x) => x.localObservationId === fail.id); if (t) await services.storage.queueObservation({ ...t, status: 'failed', lastError: fail.error }); }
    setMessage(`Observations uploaded: ${result.acceptedIds.length}, failed: ${result.failed.length}`);
    await refresh();
  };

  const uploadDrafts = async () => {
    const session = await requireSession();
    if (session.role === 'guest' || session.role === 'viewer') return setMessage('Current role cannot upload drafts.');
    const queued = (await services.storage.listDrafts()).filter((d) => d.status === 'queued');
    const result = await services.sync.pushDrafts(session, queued);
    for (const id of result.acceptedIds) { const t = queued.find((x) => x.localDraftId === id); if (t) await services.storage.queueDraft({ ...t, status: 'sent' }); }
    for (const fail of result.failed) { const t = queued.find((x) => x.localDraftId === fail.id); if (t) await services.storage.queueDraft({ ...t, status: 'failed', lastError: fail.error }); }
    setMessage(`Drafts uploaded: ${result.acceptedIds.length}, failed: ${result.failed.length}`);
    await refresh();
  };

  return (
    <section>
      <h2>Sync</h2>
      <div className="panel">
        <p>Last sync: {syncState}</p>
        <p>Queued proposals: {outboxCount}</p>
        <p>Queued observations: {obsCount}</p>
        <p>Queued drafts: {draftCount}</p>
      </div>
      <div className="grid cols-2">
        <button onClick={downloadUpdates}>Download central updates</button>
        <button onClick={uploadProposals}>Upload proposals</button>
        <button onClick={uploadObservations}>Upload observations</button>
        <button onClick={uploadDrafts}>Upload drafts</button>
      </div>
      <p>{message}</p>
    </section>
  );
}
