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

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await register(email, name, password);
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
          <h1 className="font-display text-3xl">Crea tu cuenta</h1>
          <p className="mt-1.5 text-sm text-[--color-muted]">
            Empieza a estimar con tu equipo en un minuto.
          </p>

          <form onSubmit={submit} className="mt-7 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" placeholder="Ada Lovelace" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="tu@equipo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" placeholder="mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {err && (
              <p className="rounded-lg border border-[--color-danger]/30 bg-[--color-danger]/10 px-3 py-2 text-sm text-[--color-danger]">
                {err}
              </p>
            )}
            <Button type="submit" size="lg" disabled={busy} className="mt-1">
              {busy ? 'Creando…' : 'Crear cuenta'}
            </Button>
          </form>
        </Panel>

        <p className="mt-6 text-center text-sm text-[--color-muted]">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-medium text-[--color-gold] hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
