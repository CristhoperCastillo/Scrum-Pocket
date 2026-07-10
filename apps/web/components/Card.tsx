'use client';
import { cn } from '../lib/utils';
import { Spade } from './brand';

export function Card({
  value,
  selected,
  onPick,
}: {
  value: string;
  selected: boolean;
  onPick: (v: string) => void;
}) {
  return (
    <button
      onClick={() => onPick(value)}
      aria-pressed={selected}
      className={cn(
        'group relative grid h-24 w-16 place-items-center rounded-xl border font-display text-2xl transition-all duration-150 ring-focus',
        'hover:-translate-y-1.5',
        selected
          ? 'border-[--color-gold] bg-gradient-to-b from-[--color-gold]/25 to-[--color-surface] text-[--color-gold] shadow-[0_0_0_1px_var(--color-gold),0_12px_28px_-12px_oklch(0.62_0.12_70/0.7)] -translate-y-1.5'
          : 'border-[--color-border-hi] bg-gradient-to-b from-[--color-surface-hi] to-[--color-surface] text-[--color-fg] shadow-[var(--shadow-card)] hover:border-[--color-gold]/60'
      )}
    >
      <span className="absolute left-1.5 top-1 font-mono text-[10px] text-[--color-faint]">{value}</span>
      <span className={cn('transition-transform group-hover:scale-110', selected && 'text-gold-gradient')}>
        {value}
      </span>
      <Spade
        className={cn(
          'absolute bottom-1 right-1.5 size-3 transition-colors',
          selected ? 'text-[--color-gold]' : 'text-[--color-felt]/70'
        )}
      />
    </button>
  );
}
