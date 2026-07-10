'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';

type Room = { id: string; name: string; inviteCode: string };

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [name, setName] = useState(''); const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [loading, user, router]);
  const load = () => api.request<Room[]>('/rooms').then(setRooms).catch(() => {});
  useEffect(() => { if (user) load(); }, [user]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try { await api.request('/rooms', { method: 'POST', body: JSON.stringify({ name }) }); setName(''); load(); }
    catch (e: any) { setErr(e.message); }
  };
  const join = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    try {
      const room = await api.request<Room>('/rooms/join', { method: 'POST', body: JSON.stringify({ inviteCode: code.toUpperCase() }) });
      router.push(`/room/${room.inviteCode}`);
    } catch (e: any) { setErr(e.message); }
  };

  if (loading || !user) return <p>Cargando...</p>;
  return (
    <main style={{ padding: 40, maxWidth: 560 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Hola, {user.name}</h1>
        <button onClick={() => logout().then(() => router.push('/login'))}>Salir</button>
      </div>

      <section style={{ display: 'flex', gap: 24, marginTop: 16 }}>
        <form onSubmit={create}>
          <h3>Crear sala</h3>
          <input placeholder="nombre" value={name} onChange={e => setName(e.target.value)} />
          <button type="submit">Crear</button>
        </form>
        <form onSubmit={join}>
          <h3>Unirse</h3>
          <input placeholder="código" value={code} onChange={e => setCode(e.target.value)} maxLength={6} />
          <button type="submit">Unirse</button>
        </form>
      </section>
      {err && <p style={{ color: 'red' }}>{err}</p>}

      <h3>Mis salas</h3>
      <ul>
        {rooms.map(r => (
          <li key={r.id}>
            <Link href={`/room/${r.inviteCode}`}>{r.name}</Link> — código <b>{r.inviteCode}</b>
          </li>
        ))}
      </ul>
    </main>
  );
}
