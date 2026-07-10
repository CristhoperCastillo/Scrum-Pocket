'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Plus, DoorOpen, ArrowRight, LayoutGrid } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Panel, PanelBody, PanelHeader, PanelTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Spade } from '../../components/brand';

type Room = { id: string; name: string; inviteCode: string };

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);
  const load = () => api.request<Room[]>('/rooms').then(setRooms).catch(() => {});
  useEffect(() => {
    if (user) load();
  }, [user]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await api.request('/rooms', { method: 'POST', body: JSON.stringify({ name }) });
      setName('');
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  };
  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      const room = await api.request<Room>('/rooms/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode: code.toUpperCase() }),
      });
      router.push(`/room/${room.inviteCode}`);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  if (loading || !user)
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-[--color-muted]">Cargando…</div>
    );

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-[--color-border] bg-[--color-bg-deep]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 font-display text-lg">
            <Spade className="size-5 text-[--color-gold]" />
            Scrum Poker
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[--color-muted] sm:inline">
              Hola, <span className="text-[--color-fg]">{user.name}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => logout().then(() => router.push('/login'))}>
              <LogOut /> Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="animate-rise">
          <h1 className="font-display text-4xl">Tus mesas</h1>
          <p className="mt-1.5 text-[--color-muted]">Crea una sala nueva o únete con un código de invitación.</p>
        </div>

        <section className="mt-8 grid gap-5 sm:grid-cols-2">
          <Panel>
            <PanelHeader>
              <PanelTitle className="flex items-center gap-2">
                <Plus className="size-4 text-[--color-gold]" /> Crear sala
              </PanelTitle>
            </PanelHeader>
            <PanelBody>
              <form onSubmit={create} className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="rname">Nombre de la sala</Label>
                  <Input id="rname" placeholder="Sprint 42 · Backlog" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full">
                  Crear mesa
                </Button>
              </form>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle className="flex items-center gap-2">
                <DoorOpen className="size-4 text-[--color-felt]" /> Unirse
              </PanelTitle>
            </PanelHeader>
            <PanelBody>
              <form onSubmit={join} className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="rcode">Código de invitación</Label>
                  <Input
                    id="rcode"
                    placeholder="ABC123"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="font-mono uppercase tracking-[0.3em]"
                    required
                  />
                </div>
                <Button type="submit" variant="felt" className="w-full">
                  Unirse a la mesa
                </Button>
              </form>
            </PanelBody>
          </Panel>
        </section>

        {err && (
          <p className="mt-4 rounded-lg border border-[--color-danger]/30 bg-[--color-danger]/10 px-3 py-2 text-sm text-[--color-danger]">
            {err}
          </p>
        )}

        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.14em] text-[--color-faint]">
            <LayoutGrid className="size-4" /> Mis salas
          </div>

          {rooms.length === 0 ? (
            <Panel className="grid place-items-center py-14 text-center">
              <Spade className="size-8 text-[--color-border-hi]" />
              <p className="mt-3 text-sm text-[--color-muted]">Aún no tienes salas. Crea la primera arriba.</p>
            </Panel>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((r) => (
                <Link key={r.id} href={`/room/${r.inviteCode}`} className="group">
                  <Panel className="h-full p-5 transition-all group-hover:-translate-y-0.5 group-hover:border-[--color-gold]/50">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-xl leading-tight">{r.name}</h3>
                      <ArrowRight className="size-4 shrink-0 text-[--color-faint] transition-transform group-hover:translate-x-0.5 group-hover:text-[--color-gold]" />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <Badge tone="gold" className="font-mono tracking-widest">
                        {r.inviteCode}
                      </Badge>
                      <span className="text-xs text-[--color-faint]">Entrar →</span>
                    </div>
                  </Panel>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
