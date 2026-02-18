import { NavLink, Route, Routes } from 'react-router-dom';
import type { AuthSession } from '../../../core/types';
import { PendingProposalsPage } from './PendingProposalsPage';
import { CardEditorPage } from './CardEditorPage';
import { AuditLogPage } from './AuditLogPage';
import { TrustViewPage } from './TrustViewPage';
import { RollbackPage } from './RollbackPage';

type Props = { session: AuthSession };

export function AdminDashboardPage({ session }: Props) {
  if (session.role !== 'moderator' && session.role !== 'admin') {
    return <p>Admin dashboard requires moderator/admin role.</p>;
  }

  return (
    <section>
      <h2>Admin / Moderation Dashboard</h2>
      <div className="panel" style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        <NavLink to="">Queue</NavLink>
        {session.role === 'admin' && <NavLink to="editor">Card Editor</NavLink>}
        <NavLink to="audit">Audit Log</NavLink>
        <NavLink to="trust">User/Device Trust</NavLink>
        {session.role === 'admin' && <NavLink to="rollback">Rollback</NavLink>}
      </div>

      <Routes>
        <Route index element={<PendingProposalsPage session={session} />} />
        <Route path="editor" element={<CardEditorPage session={session} />} />
        <Route path="audit" element={<AuditLogPage session={session} />} />
        <Route path="trust" element={<TrustViewPage session={session} />} />
        <Route path="rollback" element={<RollbackPage session={session} />} />
      </Routes>
    </section>
  );
}
