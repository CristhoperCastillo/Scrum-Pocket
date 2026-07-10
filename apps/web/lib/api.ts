const BASE = process.env.NEXT_PUBLIC_API_URL!;
let accessToken: string | null = null;

export const api = {
  setAccessToken(t: string | null) { accessToken = t; },
  getAccessToken() { return accessToken; },

  async request<T>(path: string, opts: RequestInit = {}, retry = true): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      ...opts,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(opts.headers ?? {}),
      },
    });
    if (res.status === 401 && retry) {
      const r = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (r.ok) { accessToken = (await r.json()).accessToken; return this.request<T>(path, opts, false); }
    }
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
    return res.status === 204 ? (undefined as T) : res.json();
  },
};
