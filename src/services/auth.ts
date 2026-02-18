import type { IAuthService } from './interfaces';
import type { Role } from '../core/types';
import { mockServer } from './mockServer';

export class MockAuthService implements IAuthService {
  private sessionKey = 'mock-auth-session';

  async login(role: Role) {
    const session = mockServer.login(role);
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
    return session;
  }

  async getSession() {
    const raw = localStorage.getItem(this.sessionKey);
    if (!raw) return undefined;
    return JSON.parse(raw);
  }
}
