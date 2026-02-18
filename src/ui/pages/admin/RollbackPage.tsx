import { useState } from 'react';
import type { AuthSession } from '../../../core/types';
import { useServices } from '../../hooks/useServices';

type Props = { session: AuthSession };

export function RollbackPage({ session }: Props) {
  const services = useServices();
  const [cardId, setCardId] = useState('c1');
  const [toVersion, setToVersion] = useState('1');
  const [history, setHistory] = useState<string>('');

  if (session.role !== 'admin') return <p>Rollback is admin-only.</p>;

  return (
    <div className="panel">
      <h3>Rollback / Version History</h3>
      <label>Card ID</label>
      <input value={cardId} onChange={(e) => setCardId(e.target.value)} />
      <label>Target Version</label>
      <input value={toVersion} onChange={(e) => setToVersion(e.target.value)} />
      <button onClick={async () => {
        await services.moderation.rollbackCard(session, cardId, Number(toVersion));
        const logs = await services.moderation.getCardHistory(session, cardId);
        setHistory(JSON.stringify(logs, null, 2));
      }}>Rollback</button>
      <button className="secondary" onClick={async () => {
        const logs = await services.moderation.getCardHistory(session, cardId);
        setHistory(JSON.stringify(logs, null, 2));
      }}>Load history</button>
      <pre>{history}</pre>
    </div>
  );
}
