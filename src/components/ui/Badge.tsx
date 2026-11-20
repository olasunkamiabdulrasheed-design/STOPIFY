import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { GoalStatus, Priority, TaskStatus } from '@/lib/types';

export type BadgeTone =
  | 'slate'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'sky'
  | 'orange';

const tones: Record<BadgeTone, string> = {
  slate: 'border-white/10 bg-white/[0.06] text-slate-300',
  violet: 'border-accent-400/25 bg-accent-500/15 text-accent-200',
  emerald: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  rose: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
  sky: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
  orange: 'border-orange-500/25 bg-orange-500/10 text-orange-300',
};

export function Badge({
  children,
  tone = 'slate',
  className,
  title,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const statusTone: Record<TaskStatus, BadgeTone> = {
  not_started: 'slate',
  in_progress: 'sky',
  completed: 'emerald',
  postponed: 'amber',
  overdue: 'rose',
};

export const statusLabel: Record<TaskStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  postponed: 'Postponed',
  overdue: 'Overdue',
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <Badge tone={statusTone[status]} className={className}>
      {statusLabel[status]}
    </Badge>
  );
}

export const priorityTone: Record<Priority, BadgeTone> = {
  low: 'slate',
  medium: 'sky',
  high: 'orange',
  critical: 'rose',
};

export const priorityLabel: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  return (
    <Badge tone={priorityTone[priority]} className={className}>
      {priorityLabel[priority]}
    </Badge>
  );
}

export function SourceBadge({ source }: { source: 'simulated' }) {
  return (
    <Badge
      tone="violet"
      title={
        source === 'simulated'
          ? 'Generated locally in your browser from your own data. No external AI provider is connected.'
          : undefined
      }
    >
      Simulated AI
    </Badge>
  );
}

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  if (status === 'completed') return <Badge tone="emerald">Completed</Badge>;
  if (status === 'archived') return <Badge tone="slate">Archived</Badge>;
  return <Badge tone="violet">Active</Badge>;
}
