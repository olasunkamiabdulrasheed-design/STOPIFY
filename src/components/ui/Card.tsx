import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('surface', className)} {...props}>
      {children}
    </div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function CardHeader({
  title,
  description,
  action,
  icon,
  className,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn('flex flex-wrap items-start justify-between gap-3', className)}
      {...props}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-accent-300">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-slate-100">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardSection({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5 sm:p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function SectionTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('font-display text-lg font-semibold text-slate-100', className)} {...props}>
      {children}
    </h2>
  );
}
