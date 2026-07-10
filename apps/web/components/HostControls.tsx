'use client';
import { useState } from 'react';
import { Play, Eye, Check, SkipForward } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function HostControls({
  isHost,
  activeRoundId,
  revealed,
  onStart,
  onReveal,
  onFinal,
  onNext,
  deck,
}: {
  isHost: boolean;
  activeRoundId: string | null;
  revealed: boolean;
  onStart: (title: string) => void;
  onReveal: () => void;
  onFinal: (value: string) => void;
  onNext: () => void;
  deck: string[];
}) {
  const [title, setTitle] = useState('');
  const [final, setFinal] = useState(deck[0]);
  if (!isHost) return null;

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[--color-gold]/20 bg-[--color-gold]/[0.04] p-3">
      <span className="mr-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[--color-gold]">
        Host
      </span>
      {!activeRoundId ? (
        <>
          <Input
            placeholder="¿Qué vais a estimar?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 w-56 flex-1"
          />
          <Button
            size="sm"
            onClick={() => {
              if (title) {
                onStart(title);
                setTitle('');
              }
            }}
          >
            <Play /> Iniciar ronda
          </Button>
        </>
      ) : !revealed ? (
        <Button size="sm" variant="felt" onClick={onReveal}>
          <Eye /> Revelar votos
        </Button>
      ) : (
        <>
          <select
            value={final}
            onChange={(e) => setFinal(e.target.value)}
            className="h-9 rounded-[--radius] border border-[--color-border] bg-[--color-bg]/60 px-3 font-mono text-sm text-[--color-fg] ring-focus focus:border-[--color-gold]"
          >
            {deck.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={() => onFinal(final)}>
            <Check /> Fijar estimación
          </Button>
          <Button size="sm" variant="outline" onClick={onNext}>
            <SkipForward /> Siguiente
          </Button>
        </>
      )}
    </div>
  );
}
