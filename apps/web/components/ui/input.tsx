import * as React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-[--radius] border border-[--color-border] bg-[--color-bg]/60 px-3.5 text-sm text-[--color-fg]',
        'placeholder:text-[--color-faint] transition-colors',
        'focus:border-[--color-gold] focus:bg-[--color-bg] ring-focus',
        'disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
