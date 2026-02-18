import type { AuthSession, Role } from '../core/types';
import type { IAuthService } from './interfaces';
import { mockServer } from './mockServer';

const TEST_ACCOUNTS: Record<string, { password: string; role: Role }> = {
  admin: { password: 'admin123', role: 'admin' },
  mod: { password: 'mod123', role: 'moderator' },
  user: { password: 'user123', role: 'contributor' },
  guest: { password: 'guest', role: 'guest' },
};

export class MockAuthService implements IAuthService {
  private sessionKey = 'auth_token';

  async login(username: string, password: string): Promise<AuthSession> {
    const account = TEST_ACCOUNTS[username.trim().toLowerCase()];
    if (!account || account.password !== password) {
      throw new Error('Invalid test credentials');
    }
    const session = mockServer.login(account.role, username.trim().toLowerCase());
    localStorage.setItem(this.sessionKey, session.token);
    localStorage.setItem('mock-auth-session', JSON.stringify(session));
    return session;
  }

  async continueAsGuest(): Promise<AuthSession> {
    const session = mockServer.login('guest', 'guest');
    localStorage.setItem(this.sessionKey, session.token);
    localStorage.setItem('mock-auth-session', JSON.stringify(session));
    return session;
  }

  async logout(): Promise<void> {
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem('mock-auth-session');
  }

  async getSession(): Promise<AuthSession | undefined> {
    const raw = localStorage.getItem('mock-auth-session');
    if (!raw) return undefined;
    return JSON.parse(raw) as AuthSession;
  }
}

export const testAccounts = TEST_ACCOUNTS;
