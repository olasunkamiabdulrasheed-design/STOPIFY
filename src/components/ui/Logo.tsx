import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function Logo({
  className,
  size = 'md',
  withWordmark = true,
  asLink = false,
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  withWordmark?: boolean;
  asLink?: boolean;
}) {
  const markSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-11 w-11' : 'h-8 w-8';
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  const content = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-[10px] border border-accent-400/30 bg-ink-800',
          markSize,
        )}
        aria-hidden
      >
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <defs>
            <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#B9A2FF" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" fill="#0B1120" />
          <rect
            x="3"
            y="3"
            width="34"
            height="34"
            rx="9"
            fill="url(#logo-gradient)"
            fillOpacity="0.15"
            stroke="url(#logo-gradient)"
            strokeOpacity="0.5"
          />
          <path
            d="M22.4 8.5 13 22h6.2l-1.6 9.5L27 18.5h-6.2l1.6-10Z"
            fill="url(#logo-gradient)"
          />
        </svg>
      </span>
      {withWordmark ? (
        <span className={cn('font-display font-bold tracking-tight text-slate-100', textSize)}>
          STOP<span className="text-gradient">IFY</span>
        </span>
      ) : null}
    </span>
  );

  if (asLink) {
    return (
      <Link to="/" className="focus-visible:rounded-lg" aria-label="STOPIFY home">
        {content}
      </Link>
    );
  }
  return content;
}
