import React from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ScanPage } from './pages/ScanPage';
import { CollectionPage } from './pages/CollectionPage';
import { SyncPage } from './pages/SyncPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { SettingsPage } from './pages/SettingsPage';
import { ResultPage } from './pages/ResultPage';
import { useEffect, useState } from 'react';
import { useServices } from './hooks/useServices';
import type { AuthSession } from '../core/types';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { LoginPage } from './pages/LoginPage';

function Protected({ session, children }: { session?: AuthSession; children: React.ReactNode }) {
  const location = useLocation();
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

export function App() {
  const services = useServices();
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthSession>();

  useEffect(() => {
    services.storage.init().then(async () => setSession(await services.storage.getSession()));
  }, [services.storage]);

  const signOut = async () => {
    await services.auth.logout();
    await services.storage.clearSession();
    setSession(undefined);
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header>
        <h1>Yu-Gi-Oh! Scanner MVP</h1>
        <p>{session ? <>Signed in as <strong>{session.username}</strong> ({session.role})</> : 'Please sign in'}</p>
        {session && <button className="secondary" onClick={signOut}>Sign out</button>}
      </header>
      <main>
        <Routes>
          <Route path="/login" element={session ? <Navigate to="/scan" replace /> : <LoginPage />} />
          <Route path="/scan" element={<Protected session={session}><ScanPage /></Protected>} />
          <Route path="/results/:scanId" element={<Protected session={session}><ResultPage /></Protected>} />
          <Route path="/collection" element={<Protected session={session}><CollectionPage /></Protected>} />
          <Route path="/sync" element={<Protected session={session}><SyncPage /></Protected>} />
          <Route path="/data" element={<Protected session={session}><DataManagementPage /></Protected>} />
          <Route path="/settings" element={<Protected session={session}><SettingsPage /></Protected>} />
          <Route path="/admin/*" element={<Protected session={session}>{session ? <AdminDashboardPage session={session} /> : <div />}</Protected>} />
          <Route path="*" element={<Navigate to={session ? '/scan' : '/login'} replace />} />
        </Routes>
      </main>
      {session && (
        <nav>
          <NavLink to="/scan">Scan</NavLink>
          <NavLink to="/collection">Collection</NavLink>
          <NavLink to="/sync">Sync</NavLink>
          <NavLink to="/data">Data</NavLink>
          <NavLink to="/settings">Settings</NavLink>
          {(session.role === 'moderator' || session.role === 'admin') && <NavLink to="/admin">Admin</NavLink>}
        </nav>
      )}
    </div>
  );
}
