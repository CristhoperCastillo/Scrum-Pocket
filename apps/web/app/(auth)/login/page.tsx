'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try { await login(email, password); router.push('/dashboard'); }
    catch (e: any) { setErr(e.message); }
  };

  return (
    <main style={{ padding: 40, maxWidth: 320 }}>
      <h1>Login</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
        <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">Entrar</button>
        {err && <p style={{ color: 'red' }}>{err}</p>}
      </form>
    </main>
  );
}
