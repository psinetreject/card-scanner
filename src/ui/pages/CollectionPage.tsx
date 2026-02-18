import { useEffect, useMemo, useState } from 'react';
import { useServices } from '../hooks/useServices';

export function CollectionPage() {
  const services = useServices();
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<{ entryId: string; cardId: string; quantity: number; notes?: string }[]>([]);
  const [cards, setCards] = useState<{ id: string; name: string; consensus?: Record<string, { consensusScore: number; disagreementCount: number }> }[]>([]);
  const [scans, setScans] = useState<{ scanId: string; matchedCardId?: string; timestamp: string }[]>([]);

  useEffect(() => {
    services.storage.init().then(async () => {
      const [collection, cacheCards, userScans] = await Promise.all([
        services.storage.getCollection(),
        services.storage.getCacheCards(),
        services.storage.getScans(),
      ]);
      setEntries(collection);
      setCards(cacheCards.map((c) => ({ id: c.id, name: c.name, consensus: c.consensus } as any)));
      setScans(userScans);
    });
  }, [services.storage]);

  const visible = useMemo(() => {
    const nameById = new Map(cards.map((c) => [c.id, c.name]));
    return entries.filter((e) => (nameById.get(e.cardId) ?? '').toLowerCase().includes(query.toLowerCase()));
  }, [entries, cards, query]);

  return (
    <section>
      <h2>Collection</h2>
      <div className="panel"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search card name" /></div>
      <div className="panel">
        <h3>Your cards</h3>
        <div className="list">
          {visible.map((e) => (
            <div className="card" key={e.entryId}>
              <strong>{cards.find((c) => c.id === e.cardId)?.name ?? e.cardId}</strong> × {e.quantity}
              <div><small className="muted">Local user entry. Canonical card from cache mirror.</small></div>
              {(() => { const meta = cards.find((c) => c.id === e.cardId)?.consensus?.['cards.name']; if (!meta) return null; return <div><small className={meta.consensusScore >= 0.85 && meta.disagreementCount <= 1 ? 'status-good' : 'status-warn'}>{meta.consensusScore >= 0.85 && meta.disagreementCount <= 1 ? 'Community verified' : 'Disputed'}</small></div>; })()}
            </div>
          ))}
          {visible.length === 0 && <p>No entries yet.</p>}
        </div>
      </div>
      <div className="panel">
        <h3>Recent scans</h3>
        <div className="list">
          {scans.slice(-8).reverse().map((s) => (
            <div key={s.scanId} className="card">{new Date(s.timestamp).toLocaleString()} · {cards.find((c) => c.id === s.matchedCardId)?.name ?? 'unmatched'}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
