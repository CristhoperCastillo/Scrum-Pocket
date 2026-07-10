'use client';
import { useState } from 'react';

export function HostControls({ isHost, activeRoundId, onStart, onReveal, onFinal, deck }: {
  isHost: boolean; activeRoundId: string | null;
  onStart: (title: string) => void; onReveal: () => void;
  onFinal: (value: string) => void; deck: string[];
}) {
  const [title, setTitle] = useState(''); const [final, setFinal] = useState(deck[0]);
  if (!isHost) return null;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '16px 0' }}>
      {!activeRoundId
        ? <>
            <input placeholder="tarea a estimar" value={title} onChange={e => setTitle(e.target.value)} />
            <button onClick={() => { if (title) { onStart(title); setTitle(''); } }}>Iniciar ronda</button>
          </>
        : <>
            <button onClick={onReveal}>Revelar</button>
            <select value={final} onChange={e => setFinal(e.target.value)}>
              {deck.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button onClick={() => onFinal(final)}>Fijar estimación</button>
          </>}
    </div>
  );
}
