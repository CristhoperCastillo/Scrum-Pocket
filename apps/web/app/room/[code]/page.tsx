'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Socket } from 'socket.io-client';
import { useAuth } from '../../../lib/auth-context';
import { api } from '../../../lib/api';
import { connectGame } from '../../../lib/socket';
import { DECK } from '../../../lib/deck';
import { Card } from '../../../components/Card';
import { MemberList } from '../../../components/MemberList';
import { HostControls } from '../../../components/HostControls';
import { HistoryPanel } from '../../../components/HistoryPanel';

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

  if (loading || !user) return <p>Cargando...</p>;
  if (err) return <main style={{ padding: 40 }}><p style={{ color: 'red' }}>{err}</p></main>;
  if (!state) return <p>Cargando sala...</p>;

  return (
    <main style={{ padding: 40, maxWidth: 720 }}>
      <h1>{state.name} <small>({code})</small></h1>

      {activeRound
        ? <h3>Estimando: {activeRound.taskTitle}</h3>
        : <p>Sin ronda activa{isHost ? '. Inicia una.' : '. Espera al host.'}</p>}

      <MemberList members={state.members} votedIds={votedIds} revealed={revealed} votes={votes} />

      {revealed && <p><b>Promedio:</b> {avg ?? '—'}</p>}

      <HostControls
        isHost={isHost} activeRoundId={activeRound?.id ?? null}
        onStart={start} onReveal={reveal} onFinal={setFinal} deck={state.deck ?? DECK}
      />

      {activeRound && !revealed && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          {(state.deck ?? DECK).map(v => (
            <Card key={v} value={v} selected={myVote === v} onPick={pick} />
          ))}
        </div>
      )}

      <HistoryPanel rounds={history} />
    </main>
  );
}
