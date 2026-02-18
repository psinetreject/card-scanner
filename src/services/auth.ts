import type { IAuthService } from './interfaces';
import { mockServer } from './mockServer';

export class MockAuthService implements IAuthService {
  private sessionKey = 'auth_token';

  async login(identifier: string, _password: string) {
    const session = mockServer.login(identifier.includes('admin') ? 'admin' : identifier.includes('mod') ? 'moderator' : 'contributor');
    localStorage.setItem(this.sessionKey, session.token);
    localStorage.setItem('mock-auth-session', JSON.stringify(session));
    return session;
  }

  async continueAsGuest() {
    const session = mockServer.login('viewer');
    localStorage.setItem(this.sessionKey, session.token);
    localStorage.setItem('mock-auth-session', JSON.stringify(session));
    return session;
  }

  async logout(): Promise<void> {
    localStorage.removeItem(this.sessionKey);
    localStorage.removeItem('mock-auth-session');
  }

  async getSession() {
    const raw = localStorage.getItem('mock-auth-session');
    if (!raw) return undefined;
    return JSON.parse(raw);
  }
}
