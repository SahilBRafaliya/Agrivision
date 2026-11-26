const API_BASE_URL = 'http://localhost:8000';

export interface UserOut {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  user: UserOut;
}

export const authAPI = {
  async register(email: string, password: string, full_name?: string, role = 'farmer', admin_key?: string): Promise<Token> {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name, role, admin_key }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  async login(email: string, password: string): Promise<Token> {
    const res = await fetch(`${API_BASE_URL}/auth/login/json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }
    return res.json();
  },

  async me(token: string): Promise<UserOut> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Session expired');
    return res.json();
  },

  getStoredToken(): string | null {
    return localStorage.getItem('agrivision_token');
  },

  storeToken(token: string): void {
    localStorage.setItem('agrivision_token', token);
  },

  clearToken(): void {
    localStorage.removeItem('agrivision_token');
    localStorage.removeItem('agrivision_user');
  },

  getStoredUser(): UserOut | null {
    const raw = localStorage.getItem('agrivision_user');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  storeUser(user: UserOut): void {
    localStorage.setItem('agrivision_user', JSON.stringify(user));
  },
};
