import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const chartTheme = {
  accent: '#A78BFA',
  accentStrong: '#8B5CF6',
  emerald: '#34D399',
  amber: '#FBBF24',
  rose: '#F87171',
  sky: '#38BDF8',
  slate: '#64748B',
  grid: 'rgba(148, 163, 184, 0.1)',
  axis: '#64748B',
};

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

export function ChartTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  suffix?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-ink-850/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label !== undefined ? (
        <p className="mb-1 font-medium text-slate-300">{String(label)}</p>
      ) : null}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: entry.color ?? chartTheme.accent }}
              />
              {entry.name ?? entry.dataKey}
            </span>
            <span className="font-medium tabular-nums text-slate-100">
              {entry.value}
              {suffix ?? ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartFrame({
  title,
  description,
  action,
  children,
  empty,
  emptyMessage = 'Not enough data yet.',
  height = 260,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  empty?: boolean;
  emptyMessage?: string;
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn('surface p-5 sm:p-6', className)}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-100">{title}</h2>
          {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {empty ? (
        <div
          className="flex items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] text-xs text-slate-500"
          style={{ height }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div style={{ height }}>{children}</div>
      )}
    </div>
  );
}

export const axisProps = {
  stroke: chartTheme.axis,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
  tick: { fill: chartTheme.axis },
} as const;

export const gridProps = {
  stroke: chartTheme.grid,
  strokeDasharray: '3 6',
  vertical: false,
} as const;
