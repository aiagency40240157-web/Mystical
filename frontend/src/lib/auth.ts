'use client';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function getRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_role');
}

export function setAuth(token: string, role: string): void {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_role', role);
}

export function clearAuth(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_role');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function hasRole(...roles: string[]): boolean {
  const role = getRole();
  return !!role && roles.includes(role);
}
