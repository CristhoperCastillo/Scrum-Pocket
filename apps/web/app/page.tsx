'use client';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

export default function Home() {
  const { user, loading } = useAuth();
  if (loading) return <p>Cargando...</p>;
  return (
    <main style={{ padding: 40 }}>
      <h1>Scrum Poker</h1>
      {user
        ? <Link href="/dashboard">Ir al dashboard</Link>
        : <p><Link href="/login">Login</Link> · <Link href="/register">Registro</Link></p>}
    </main>
  );
}
