'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

type User = { id: string; email: string; name: string };
type Ctx = {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<Ctx>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (r.ok) { api.setAccessToken((await r.json()).accessToken); setUser(await api.request('/auth/me')); }
      } catch { /* not logged in */ }
      setLoading(false);
    })();
  }, []);

  const handle = (data: { accessToken: string; user: User }) => {
    api.setAccessToken(data.accessToken); setUser(data.user);
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      login: async (email, password) =>
        handle(await api.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })),
      register: async (email, name, password) =>
        handle(await api.request('/auth/register', { method: 'POST', body: JSON.stringify({ email, name, password }) })),
      logout: async () => { await api.request('/auth/logout', { method: 'POST' }); api.setAccessToken(null); setUser(null); },
    }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
