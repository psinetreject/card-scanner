import { useEffect, useState } from 'react';
import type { AuthSession, UserTrustStats } from '../../../core/types';
import { useServices } from '../../hooks/useServices';

type Props = { session: AuthSession };

export function TrustViewPage({ session }: Props) {
  const services = useServices();
  const [stats, setStats] = useState<UserTrustStats[]>([]);
  useEffect(() => { services.moderation.getTrustStats(session).then(setStats); }, []);
  return (
    <div className="panel">
      <h3>User / Device Trust View</h3>
      <div className="list">
        {stats.map((s) => (
          <div className="card" key={s.userId}>
            {s.userId}: accepted {s.acceptedCount}, rejected {s.rejectedCount}, rejection {(s.rejectionRate * 100).toFixed(1)}%, trust {s.trustScore}
          </div>
        ))}
      </div>
    </div>
  );
}
