'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth-context';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Panel } from '../../../components/ui/card';
import { Spade } from '../../../components/brand';

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12">
      <div className="w-full max-w-sm animate-rise">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5 font-display text-lg">
          <Spade className="size-6 text-[--color-gold]" />
          Scrum Poker
        </Link>

        <Panel className="p-7">
          <h1 className="font-display text-3xl">Bienvenido de vuelta</h1>
          <p className="mt-1.5 text-sm text-[--color-muted]">
            Entra para volver a tu mesa de estimación.
          </p>

          <form onSubmit={submit} className="mt-7 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="tu@equipo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {err && (
              <p className="rounded-lg border border-[--color-danger]/30 bg-[--color-danger]/10 px-3 py-2 text-sm text-[--color-danger]">
                {err}
              </p>
            )}
            <Button type="submit" size="lg" disabled={busy} className="mt-1">
              {busy ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </Panel>

        <p className="mt-6 text-center text-sm text-[--color-muted]">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="font-medium text-[--color-gold] hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  );
}
