import { useEffect, useState } from 'react';
import { useServices } from '../hooks/useServices';

export function SyncPage() {
  const services = useServices();
  const [syncState, setSyncState] = useState<string>('Not synced yet');
  const [outboxCount, setOutboxCount] = useState(0);
  const [obsCount, setObsCount] = useState(0);
  const [message, setMessage] = useState('');

  const refresh = async () => {
    await services.storage.init();
    const [state, proposals, observations] = await Promise.all([
      services.storage.getSyncState(),
      services.storage.listProposals(),
      services.storage.listObservations(),
    ]);
    setSyncState(state.lastSyncAt ?? 'Never');
    setOutboxCount(proposals.filter((p) => p.status === 'queued').length);
    setObsCount(observations.filter((o) => o.status === 'queued').length);
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
      appVersion: '0.3.0',
      schemaVersion: 3,
      exportedAt: new Date().toISOString(),
      cache_cards: payload.cards,
      cache_prints: payload.prints,
      cache_aliases: payload.aliases,
      claims: payload.claims,
      user_collection: [],
      user_scans: [],
      outbox_proposals: [],
      outbox_observations: [],
      sync_state: payload.syncState,
    }, 'merge');
    await services.storage.setSyncState(payload.syncState);
    setMessage('Pulled canonical + claim updates from central service.');
    await refresh();
  };

  const uploadProposals = async () => {
    const session = await requireSession();
    const queued = (await services.storage.listProposals()).filter((p) => p.status === 'queued');
    const result = await services.sync.pushProposals(session, queued);
    for (const id of result.acceptedIds) {
      const target = queued.find((x) => x.localProposalId === id);
      if (target) await services.storage.queueProposal({ ...target, status: 'sent' });
    }
    for (const fail of result.failed) {
      const target = queued.find((x) => x.localProposalId === fail.id);
      if (target) await services.storage.queueProposal({ ...target, status: 'failed', lastError: fail.error });
    }
    setMessage(`Proposals uploaded: ${result.acceptedIds.length}, failed: ${result.failed.length}`);
    await refresh();
  };

  const uploadObservations = async () => {
    const session = await requireSession();
    const queued = (await services.storage.listObservations()).filter((o) => o.status === 'queued');
    const result = await services.sync.pushObservations(session, queued);
    for (const id of result.acceptedIds) {
      const target = queued.find((x) => x.localObservationId === id);
      if (target) await services.storage.queueObservation({ ...target, status: 'sent' });
    }
    for (const fail of result.failed) {
      const target = queued.find((x) => x.localObservationId === fail.id);
      if (target) await services.storage.queueObservation({ ...target, status: 'failed', lastError: fail.error });
    }
    setMessage(`Observations uploaded: ${result.acceptedIds.length}, failed: ${result.failed.length}`);
    await refresh();
  };

  const downloadSnapshot = async () => {
    const session = await requireSession();
    const bundle = await services.sync.downloadSnapshotBundle(session);
    await services.storage.importSnapshot(bundle, 'merge');
    setMessage(`Snapshot imported${bundle.checksum ? ` (checksum ${bundle.checksum})` : ''}`);
    await refresh();
  };

  return (
    <section>
      <h2>Sync</h2>
      <div className="panel">
        <p>Last sync: {syncState}</p>
        <p>Queued proposals: {outboxCount}</p>
        <p>Queued observations: {obsCount}</p>
      </div>
      <div className="grid cols-2">
        <button onClick={downloadUpdates}>Download central updates</button>
        <button onClick={uploadProposals}>Upload proposals to /proposals</button>
        <button onClick={uploadObservations}>Upload observations to /observations</button>
        <button onClick={downloadSnapshot}>Download central snapshot bundle</button>
      </div>
      <p>{message}</p>
      <p><small className="muted">Claim status is fetched in sync and reflected as community verification metadata.</small></p>
    </section>
  );
}
