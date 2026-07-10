import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[--radius] text-sm font-semibold tracking-tight transition-all duration-150 ring-focus disabled:pointer-events-none disabled:opacity-45 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0 select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-b from-[--color-gold-hi] to-[--color-gold-deep] text-[--color-bg-deep] shadow-[0_1px_0_0_oklch(1_0_0/0.3)_inset,0_8px_20px_-8px_oklch(0.62_0.12_70/0.7)] hover:brightness-108 hover:-translate-y-px',
        felt:
          'bg-gradient-to-b from-[--color-felt] to-[--color-felt-deep] text-[--color-bg-deep] shadow-[0_1px_0_0_oklch(1_0_0/0.25)_inset,0_8px_20px_-10px_oklch(0.48_0.11_163/0.8)] hover:brightness-110 hover:-translate-y-px',
        outline:
          'border border-[--color-border-hi] bg-[--color-surface]/60 text-[--color-fg] hover:bg-[--color-surface-hi] hover:border-[--color-gold]',
        ghost:
          'text-[--color-muted] hover:bg-[--color-surface] hover:text-[--color-fg]',
        danger:
          'border border-[--color-danger]/40 bg-[--color-danger]/10 text-[--color-danger] hover:bg-[--color-danger]/20',
      },
      size: {
        sm: 'h-9 px-3.5',
        default: 'h-11 px-5',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);
Button.displayName = 'Button';

export { buttonVariants };
