import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '../hooks/useServices';
import { testAccounts } from '../../services/auth';

export function LoginPage() {
  const services = useServices();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const signIn = async (u?: string, p?: string) => {
    try {
      const session = await services.auth.login(u ?? username, p ?? password);
      await services.storage.init();
      await services.storage.setSession(session);
      navigate('/scan');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  const signAsGuest = async () => {
    const session = await services.auth.continueAsGuest();
    await services.storage.init();
    await services.storage.setSession(session);
    navigate('/scan');
  };

  const quick = async (u: string) => {
    setUsername(u);
    setPassword(testAccounts[u].password);
    await signIn(u, testAccounts[u].password);
  };

  return (
    <section>
      <h2>Login (MVP placeholder)</h2>
      <div className="panel grid">
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin/mod/user/guest" />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => signIn()}>Sign in</button>
          <button className="secondary" onClick={signAsGuest}>Continue as Guest</button>
        </div>
        {error && <p className="status-warn">{error}</p>}
      </div>

      <div className="panel">
        <h3>Test Accounts</h3>
        <p><small className="muted">Use these one-click sign-ins for MVP testing.</small></p>
        <ul>
          <li>Admin: admin / admin123 (role: admin)</li>
          <li>Moderator: mod / mod123 (role: moderator)</li>
          <li>User: user / user123 (role: contributor)</li>
          <li>Guest: guest / guest (role: guest, read-only for sync writes)</li>
        </ul>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => quick('admin')}>Sign in as Admin</button>
          <button onClick={() => quick('mod')}>Sign in as Moderator</button>
          <button onClick={() => quick('user')}>Sign in as User</button>
          <button className="secondary" onClick={() => quick('guest')}>Sign in as Guest</button>
        </div>
      </div>
    </section>
  );
}
