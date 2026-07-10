import * as React from 'react';
import { cn } from '../../lib/utils';

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'gold' | 'felt' }) {
  const tones = {
    neutral: 'border-[--color-border-hi] bg-[--color-surface] text-[--color-muted]',
    gold: 'border-[--color-gold]/30 bg-[--color-gold]/10 text-[--color-gold]',
    felt: 'border-[--color-felt]/30 bg-[--color-felt]/12 text-[--color-felt]',
  }[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones,
        className
      )}
      {...props}
    />
  );
}
