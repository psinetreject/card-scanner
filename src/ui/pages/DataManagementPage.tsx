import { useState } from 'react';
import { useServices } from '../hooks/useServices';

export function DataManagementPage() {
  const services = useServices();
  const [mode, setMode] = useState<'replace' | 'merge'>('merge');
  const [includeCollection, setIncludeCollection] = useState(true);
  const [includeScans, setIncludeScans] = useState(true);
  const [includeOutbox, setIncludeOutbox] = useState(true);
  const [message, setMessage] = useState('');

  const exportBundle = async () => {
    await services.storage.init();
    await services.bundle.exportToFile({
      cache: true,
      collection: includeCollection,
      scans: includeScans,
      outbox: includeOutbox,
      syncState: true,
    });
    setMessage('Exported bundle.');
  };

  const importBundle = async (file?: File) => {
    if (!file) return;
    await services.storage.init();
    await services.bundle.importFromFile(file, mode);
    setMessage('Imported bundle successfully.');
  };

  const resetLocalCache = async () => {
    await services.storage.init();
    await services.storage.importSnapshot({
      appVersion: '0.1.0',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      cache_cards: [],
      cache_prints: [],
      cache_aliases: [],
      user_collection: includeCollection ? await services.storage.getCollection() : [],
      user_scans: includeScans ? await services.storage.getScans() : [],
      outbox_proposals: includeOutbox ? await services.storage.listProposals() : [],
      sync_state: { lastCardsVersion: 0, lastPrintsVersion: 0, lastAliasesVersion: 0, lastImagesVersion: 0 },
    }, 'replace');
    setMessage('Cache reset done.');
  };

  return (
    <section>
      <h2>Data Management</h2>
      <div className="panel grid">
        <label><input type="checkbox" checked={includeCollection} onChange={(e) => setIncludeCollection(e.target.checked)} /> Include collection</label>
        <label><input type="checkbox" checked={includeScans} onChange={(e) => setIncludeScans(e.target.checked)} /> Include scans</label>
        <label><input type="checkbox" checked={includeOutbox} onChange={(e) => setIncludeOutbox(e.target.checked)} /> Include outbox proposals</label>
      </div>

      <div className="panel">
        <button onClick={exportBundle}>Export local database</button>
      </div>

      <div className="panel">
        <label>Import mode</label>
        <select value={mode} onChange={(e) => setMode(e.target.value as 'replace' | 'merge')}>
          <option value="merge">Merge</option>
          <option value="replace">Replace local</option>
        </select>
        <input type="file" accept="application/json" onChange={(e) => importBundle(e.target.files?.[0])} />
      </div>

      <div className="panel">
        <button className="secondary" onClick={resetLocalCache}>Reset local cache (keep optional user data)</button>
      </div>
      <p>{message}</p>
    </section>
  );
}
