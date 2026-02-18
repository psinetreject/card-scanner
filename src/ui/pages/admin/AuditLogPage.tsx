import { useEffect, useState } from 'react';
import type { AuditLogEntry, AuthSession } from '../../../core/types';
import { useServices } from '../../hooks/useServices';

type Props = { session: AuthSession };

export function AuditLogPage({ session }: Props) {
  const services = useServices();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    services.moderation.getAuditLog(session).then(setLogs);
  }, []);

  return (
    <div className="panel">
      <h3>Audit Log</h3>
      <div className="list">
        {logs.map((l) => (
          <div key={l.auditId} className="card">
            <strong>{l.action}</strong> · {l.entity} {l.entityId} · {new Date(l.timestamp).toLocaleString()}<br />
            by {l.actorUserId} ({l.actorRole})
          </div>
        ))}
      </div>
    </div>
  );
}
