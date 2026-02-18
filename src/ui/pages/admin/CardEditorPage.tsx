import { useEffect, useState } from 'react';
import type { AuthSession, Card } from '../../../core/types';
import { useServices } from '../../hooks/useServices';

type Props = { session: AuthSession };

export function CardEditorPage({ session }: Props) {
  const services = useServices();
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<Card>();

  useEffect(() => {
    services.storage.init().then(async () => {
      const cache = await services.storage.getCacheCards();
      setCards(cache);
      setSelected(cache[0]);
    });
  }, []);

  if (session.role !== 'admin') return <p>Card editor is admin-only.</p>;

  return (
    <div className="grid cols-2">
      <div className="panel list">
        {cards.map((c) => <button className="secondary" key={c.id} onClick={() => setSelected(c)}>{c.name} (v{c.version})</button>)}
      </div>
      <div className="panel">
        {selected && (
          <>
            <h3>Edit Canonical Card</h3>
            <label>Name</label>
            <input value={selected.name} onChange={(e) => setSelected({ ...selected, name: e.target.value })} />
            <label>Type</label>
            <input value={selected.type} onChange={(e) => setSelected({ ...selected, type: e.target.value })} />
            <label>ATK</label>
            <input value={selected.atk ?? ''} onChange={(e) => setSelected({ ...selected, atk: Number(e.target.value) })} />
            <button onClick={async () => {
              await services.moderation.adminEditCard(session, selected, 'Admin editor update');
              const updated = await services.sync.pullUpdates(session);
              await services.storage.importSnapshot({
                appVersion: '0.2.0', schemaVersion: 2, exportedAt: new Date().toISOString(),
                cache_cards: updated.cards, cache_prints: updated.prints, cache_aliases: updated.aliases,
                user_collection: [], user_scans: [], outbox_proposals: [], sync_state: updated.syncState,
              }, 'merge');
              setCards(await services.storage.getCacheCards());
            }}>Save canonical edit</button>
          </>
        )}
      </div>
    </div>
  );
}
