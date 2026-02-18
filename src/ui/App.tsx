import { NavLink, Route, Routes } from 'react-router-dom';
import { ScanPage } from './pages/ScanPage';
import { CollectionPage } from './pages/CollectionPage';
import { SyncPage } from './pages/SyncPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { SettingsPage } from './pages/SettingsPage';
import { ResultPage } from './pages/ResultPage';
import { useEffect, useState } from 'react';
import { useServices } from './hooks/useServices';
import type { AuthSession, Role } from '../core/types';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';

export function App() {
  const services = useServices();
  const [session, setSession] = useState<AuthSession>();

  useEffect(() => {
    services.storage.init().then(async () => {
      const existing = await services.storage.getSession();
      if (existing) setSession(existing);
    });
  }, [services.storage]);

  const loginAs = async (role: Role) => {
    const s = await services.auth.login(role);
    await services.storage.setSession(s);
    setSession(s);
  };

  if (!session) {
    return (
      <div className="app-shell">
        <header><h1>Yu-Gi-Oh! Scanner MVP</h1><p>Select role (mock auth)</p></header>
        <main className="panel">
          <div className="grid cols-2">
            {(['viewer', 'contributor', 'moderator', 'admin'] as Role[]).map((r) => (
              <button key={r} onClick={() => loginAs(r)}>Login as {r}</button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header>
        <h1>Yu-Gi-Oh! Scanner MVP</h1>
        <p>Role: <strong>{session.role}</strong> · Device: {session.deviceId}</p>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<ScanPage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/sync" element={<SyncPage />} />
          <Route path="/data" element={<DataManagementPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin/*" element={<AdminDashboardPage session={session} />} />
        </Routes>
      </main>
      <nav>
        <NavLink to="/">Scan</NavLink>
        <NavLink to="/collection">Collection</NavLink>
        <NavLink to="/sync">Sync</NavLink>
        <NavLink to="/data">Data</NavLink>
        <NavLink to="/settings">Settings</NavLink>
        {(session.role === 'moderator' || session.role === 'admin') && <NavLink to="/admin">Admin</NavLink>}
      </nav>
    </div>
  );
}
