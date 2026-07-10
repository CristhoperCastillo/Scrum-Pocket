'use client';
import { History } from 'lucide-react';
import { Badge } from './ui/badge';

type Round = { id: string; taskTitle: string; finalEstimate: string | null; avg: number | null };

export function HistoryPanel({ rounds }: { rounds: Round[] }) {
  if (!rounds.length) return null;
  return (
    <details className="group mt-8 rounded-xl border border-[--color-border] bg-[--color-surface]/50">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-[--color-muted] transition-colors hover:text-[--color-fg]">
        <span className="flex items-center gap-2">
          <History className="size-4" /> Historial de rondas
        </span>
        <span className="flex items-center gap-2">
          <Badge>{rounds.length}</Badge>
          <span className="text-[--color-faint] transition-transform group-open:rotate-180">▾</span>
        </span>
      </summary>
      <div className="overflow-x-auto border-t border-[--color-border] px-4 py-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-[--color-faint]">
              <th className="pb-2 font-medium">Tarea</th>
              <th className="pb-2 text-center font-medium">Promedio</th>
              <th className="pb-2 text-center font-medium">Final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[--color-border]">
            {rounds.map((r) => (
              <tr key={r.id}>
                <td className="py-2.5 pr-4 text-[--color-fg]">{r.taskTitle}</td>
                <td className="py-2.5 text-center font-mono text-[--color-muted]">{r.avg ?? '—'}</td>
                <td className="py-2.5 text-center">
                  {r.finalEstimate ? (
                    <span className="font-mono font-semibold text-gold-gradient">{r.finalEstimate}</span>
                  ) : (
                    <span className="text-[--color-faint]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
