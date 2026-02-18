import { useEffect, useState } from 'react';
import type { AuthSession, PublishEvent } from '../../../core/types';
import { useServices } from '../../hooks/useServices';

type Props = { session: AuthSession };

export function PublishedHistoryPage({ session }: Props) {
  const services = useServices();
  const [events, setEvents] = useState<PublishEvent[]>([]);
  useEffect(() => { services.moderation.getPublishEvents(session).then(setEvents); }, []);
  return (
    <div className="panel">
      <h3>Published History</h3>
      <div className="list">
        {events.map((e) => (
          <div className="card" key={e.eventId}>
            <strong>{e.action}</strong> · draft {e.draftId} · {new Date(e.timestamp).toLocaleString()} · by {e.actorId} ({e.actorRole})
            <div><small className="muted">Targets: {e.resultingTargetIds.join(', ') || 'none'}</small></div>
          </div>
        ))}
      </div>
    </div>
  );
}
