'use client';
import { Check, Crown } from 'lucide-react';
import { cn } from '../lib/utils';

type Member = { user: { id: string; name: string }; role: string };
type RevealVote = { userId: string; name: string; value: string };

export function MemberList({
  members,
  votedIds,
  revealed,
  votes,
}: {
  members: Member[];
  votedIds: Set<string>;
  revealed: boolean;
  votes: RevealVote[];
}) {
  const valueFor = (id: string) => votes.find((v) => v.userId === id)?.value ?? '?';

  return (
    <ul className="flex flex-wrap gap-4">
      {members.map((m) => {
        const voted = votedIds.has(m.user.id);
        const isHost = m.role === 'HOST';
        return (
          <li key={m.user.id} className="flex w-16 flex-col items-center gap-2 text-center">
            <div
              className={cn(
                'grid h-20 w-14 place-items-center rounded-xl border font-display text-xl transition-all duration-300',
                revealed
                  ? 'animate-flip border-[--color-gold]/50 bg-gradient-to-b from-[--color-surface-hi] to-[--color-surface] text-gold-gradient shadow-[var(--shadow-card)]'
                  : voted
                    ? 'border-[--color-felt]/60 bg-[--color-felt]/12 text-[--color-felt]'
                    : 'border-dashed border-[--color-border-hi] bg-[--color-bg]/40 text-[--color-faint]'
              )}
            >
              {revealed ? valueFor(m.user.id) : voted ? <Check className="size-5" /> : ''}
            </div>
            <span className="flex max-w-full items-center gap-1 truncate text-xs text-[--color-muted]">
              {isHost && <Crown className="size-3 shrink-0 text-[--color-gold]" />}
              <span className="truncate">{m.user.name}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
