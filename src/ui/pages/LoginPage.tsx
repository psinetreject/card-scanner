import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '../hooks/useServices';

export function LoginPage() {
  const services = useServices();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const signIn = async () => {
    const s = await services.auth.login(identifier || 'contrib@example.com', password);
    await services.storage.init();
    await services.storage.setSession(s);
    navigate('/scan');
  };

  const guest = async () => {
    const s = await services.auth.continueAsGuest();
    await services.storage.init();
    await services.storage.setSession(s);
    navigate('/scan');
  };

  return (
    <section>
      <h2>Login (MVP placeholder)</h2>
      <div className="panel grid">
        <label>Email/Username</label>
        <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="user@example.com" />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button onClick={signIn}>Sign in</button>
          <button className="secondary" onClick={guest}>Continue as Guest</button>
        </div>
      </div>
    </section>
  );
}
