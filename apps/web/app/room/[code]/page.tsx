'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { Socket } from 'socket.io-client';
import { ArrowLeft, Copy, Check, Users } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { api } from '../../../lib/api';
import { connectGame } from '../../../lib/socket';
import { DECK } from '../../../lib/deck';
import { Card } from '../../../components/Card';
import { MemberList } from '../../../components/MemberList';
import { HostControls } from '../../../components/HostControls';
import { HistoryPanel } from '../../../components/HistoryPanel';
import { Badge } from '../../../components/ui/badge';
import { Panel } from '../../../components/ui/card';
import { Spade } from '../../../components/brand';

type Member = { user: { id: string; name: string }; role: string };
type State = {
  id: string; name: string; hostId: string; deck: string[];
  members: Member[];
  rounds: { id: string; taskTitle: string; votes: { userId: string }[] }[];
};
type RevealVote = { userId: string; name: string; value: string };

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);

  const [state, setState] = useState<State | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [votes, setVotes] = useState<RevealVote[]>([]);
  const [avg, setAvg] = useState<number | null>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const roomId = state?.id ?? null;
  const activeRound = state?.rounds?.[0] ?? null;
  const isHost = !!(state && user && state.hostId === user.id);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [loading, user, router]);

  // resolve code -> roomId
  useEffect(() => {
    if (!user) return;
    api.request<any[]>('/rooms')
      .then(rooms => {
        const r = rooms.find(x => x.inviteCode === code);
        if (!r) { setErr('Sala no encontrada'); return; }
        return api.request<State>(`/rooms/${r.id}`).then(full => {
          setState(full);
          setVotedIds(new Set(full.rounds?.[0]?.votes.map((v: any) => v.userId) ?? []));
        });
      })
      .catch(e => setErr(e.message));
  }, [user, code]);

  const loadHistory = (rid: string) =>
    api.request<any[]>(`/rooms/${rid}/history`).then(setHistory).catch(() => {});

  // socket wiring
  useEffect(() => {
    if (!roomId) return;
    const s = connectGame();
    socketRef.current = s;
    s.emit('join_room', { roomId });

    s.on('room_state', (st: State) => {
      setState(st);
      const round = st.rounds?.[0] ?? null;
      setVotedIds(new Set(round?.votes.map((v: any) => v.userId) ?? []));
      if (!round) { setRevealed(false); setVotes([]); setAvg(null); setMyVote(null); }
      loadHistory(st.id);
    });
    s.on('round_started', () => { setRevealed(false); setVotes([]); setAvg(null); setMyVote(null); setVotedIds(new Set()); });
    s.on('vote_cast', ({ userId }: { userId: string }) => setVotedIds(prev => new Set(prev).add(userId)));
    s.on('round_revealed', ({ votes, avg }: { votes: RevealVote[]; avg: number | null }) => {
      setRevealed(true); setVotes(votes); setAvg(avg);
    });
    s.on('round_finalized', () => { if (roomId) loadHistory(roomId); });
    s.on('error', (e: { message: string }) => setErr(e.message));

    return () => { s.disconnect(); };
  }, [roomId]);

  const pick = (value: string) => {
    if (!activeRound || revealed) return;
    setMyVote(value);
    socketRef.current?.emit('cast_vote', { roomId, roundId: activeRound.id, value });
  };
  const start = (taskTitle: string) => socketRef.current?.emit('start_round', { roomId, taskTitle });
  const reveal = () => activeRound && socketRef.current?.emit('reveal', { roomId, roundId: activeRound.id });
  const setFinal = (finalEstimate: string) => {
    if (!activeRound) return;
    socketRef.current?.emit('set_final', { roomId, roundId: activeRound.id, finalEstimate });
  };
  const next = () => {
    socketRef.current?.emit('next_round', { roomId });
    setRevealed(false); setVotes([]); setAvg(null); setMyVote(null); setVotedIds(new Set());
  };

  if (loading || !user)
    return <div className="grid min-h-dvh place-items-center text-sm text-[--color-muted]">Cargando…</div>;
  if (err)
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <Panel className="max-w-sm p-8 text-center">
          <Spade className="mx-auto size-8 text-[--color-danger]/70" />
          <p className="mt-3 text-[--color-danger]">{err}</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-[--color-gold] hover:underline">
            ← Volver al dashboard
          </Link>
        </Panel>
      </div>
    );
  if (!state)
    return <div className="grid min-h-dvh place-items-center text-sm text-[--color-muted]">Cargando sala…</div>;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-[--color-border] bg-[--color-bg-deep]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="grid size-9 place-items-center rounded-lg border border-[--color-border] text-[--color-muted] transition-colors hover:border-[--color-gold] hover:text-[--color-fg]"
              aria-label="Volver"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <h1 className="font-display text-xl leading-none">{state.name}</h1>
              <span className="flex items-center gap-1 text-xs text-[--color-faint]">
                <Users className="size-3" /> {state.members.length} en la mesa
              </span>
            </div>
          </div>
          <button
            onClick={copyCode}
            className="flex items-center gap-2 rounded-full border border-[--color-gold]/30 bg-[--color-gold]/10 px-3 py-1.5 font-mono text-sm tracking-[0.2em] text-[--color-gold] transition-colors hover:bg-[--color-gold]/20"
            title="Copiar código de invitación"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {code}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Table felt */}
        <Panel className="relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-20%,oklch(0.32_0.07_163/0.35),transparent_60%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {activeRound ? (
                <div>
                  <span className="text-xs uppercase tracking-[0.16em] text-[--color-faint]">Estimando</span>
                  <h2 className="font-display text-2xl">{activeRound.taskTitle}</h2>
                </div>
              ) : (
                <div>
                  <span className="text-xs uppercase tracking-[0.16em] text-[--color-faint]">Sin ronda activa</span>
                  <h2 className="font-display text-2xl text-[--color-muted]">
                    {isHost ? 'Inicia una ronda ↓' : 'Esperando al host…'}
                  </h2>
                </div>
              )}
              {revealed && (
                <div className="flex items-center gap-2.5 rounded-xl border border-[--color-gold]/30 bg-[--color-gold]/10 px-4 py-2">
                  <span className="text-xs uppercase tracking-[0.14em] text-[--color-gold]/80">Promedio</span>
                  <span className="font-display text-3xl text-gold-gradient">{avg ?? '—'}</span>
                </div>
              )}
            </div>

            <div className="mt-6">
              <MemberList members={state.members} votedIds={votedIds} revealed={revealed} votes={votes} />
            </div>
          </div>
        </Panel>

        <div className="mt-5">
          <HostControls
            isHost={isHost}
            activeRoundId={activeRound?.id ?? null}
            revealed={revealed}
            onStart={start}
            onReveal={reveal}
            onFinal={setFinal}
            onNext={next}
            deck={state.deck ?? DECK}
          />
        </div>

        {activeRound && !revealed && (
          <section className="mt-8">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[--color-faint]">
              <Badge tone={myVote ? 'gold' : 'neutral'}>{myVote ? `Tu voto · ${myVote}` : 'Elige tu carta'}</Badge>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {(state.deck ?? DECK).map((v) => (
                <Card key={v} value={v} selected={myVote === v} onPick={pick} />
              ))}
            </div>
          </section>
        )}

        <HistoryPanel rounds={history} />
      </main>
    </div>
  );
}
