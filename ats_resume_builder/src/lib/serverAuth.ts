// Helper to interact with the direct backend token/cookie authentication system

const BACKEND_URL = 'http://localhost:8000';

export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export function setCookie(name: string, value: string, days: number = 1) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function eraseCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
}

export interface ServerAuthResponse {
  status: string;
  message: string;
  token: string;
  email: string;
  expires_in: number;
}

export const loginWithServerToken = async (email: string): Promise<ServerAuthResponse> => {
  const res = await fetch(`${BACKEND_URL}/api/auth/login-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email: email.trim() }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Failed to generate token' }));
    throw new Error(errorData.detail || 'Server token generation failed');
  }

  const data: ServerAuthResponse = await res.json();
  if (data.token) {
    setCookie('auth_token', data.token, 1); // 1 day = 24 hours
    localStorage.setItem('auth_user_email', data.email);
    localStorage.setItem('auth_token', data.token);
  }
  return data;
};

export function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    if (!decoded.exp) return false;
    // Expired if current epoch timestamp in seconds >= exp
    return Date.now() / 1000 >= decoded.exp;
  } catch {
    return true;
  }
}

export const checkServerSession = async (): Promise<string | null> => {
  const token = getCookie('auth_token') || localStorage.getItem('auth_token');
  
  // If no token exists, clear any stale user state and show login
  if (!token) {
    localStorage.removeItem('auth_user_email');
    localStorage.removeItem('auth_token');
    return null;
  }

  // Client-side JWT expiration check
  if (isJwtExpired(token)) {
    eraseCookie('auth_token');
    localStorage.removeItem('auth_user_email');
    localStorage.removeItem('auth_token');
    return null;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (res.ok) {
      const data = await res.json();
      if (data.authenticated && data.email) {
        localStorage.setItem('auth_user_email', data.email);
        return data.email;
      }
    }

    // If server responded with 401/403 or unauthenticated, token is invalid/expired
    if (res.status === 401 || res.status === 403 || !res.ok) {
      eraseCookie('auth_token');
      localStorage.removeItem('auth_user_email');
      localStorage.removeItem('auth_token');
      return null;
    }
  } catch (err) {
    console.warn('Backend session verification error:', err);
  }

  // If token is valid according to JWT exp, allow offline session; otherwise null
  return localStorage.getItem('auth_user_email') || null;
};

export const logoutServer = async () => {
  try {
    await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (e) {
    console.error('Logout error:', e);
  } finally {
    eraseCookie('auth_token');
    localStorage.removeItem('auth_user_email');
    localStorage.removeItem('auth_token');
  }
};
