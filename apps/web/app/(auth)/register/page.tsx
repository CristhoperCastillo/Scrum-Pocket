'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState(''); const [name, setName] = useState('');
  const [password, setPassword] = useState(''); const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try { await register(email, name, password); router.push('/dashboard'); }
    catch (e: any) { setErr(e.message); }
  };

  return (
    <main style={{ padding: 40, maxWidth: 320 }}>
      <h1>Registro</h1>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
        <input placeholder="nombre" value={name} onChange={e => setName(e.target.value)} />
        <input placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" placeholder="password (min 6)" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">Crear cuenta</button>
        {err && <p style={{ color: 'red' }}>{err}</p>}
      </form>
    </main>
  );
}
