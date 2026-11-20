import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent-500 text-white shadow-glow-sm shadow-accent-900/30 hover:bg-accent-400 active:bg-accent-600',
  secondary:
    'border border-white/10 bg-white/[0.07] text-slate-100 hover:bg-white/[0.12] active:bg-white/[0.09]',
  outline:
    'border border-white/15 bg-transparent text-slate-200 hover:border-white/25 hover:bg-white/[0.05]',
  ghost: 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100',
  danger:
    'border border-rose-500/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 active:bg-rose-500/25',
  success:
    'border border-emerald-500/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 rounded-lg px-3 text-xs',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  lg: 'h-12 gap-2 rounded-xl px-5 text-sm',
  icon: 'h-9 w-9 rounded-lg p-0',
};

export function buttonStyles(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900',
    'disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonStyles(variant, size, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});
