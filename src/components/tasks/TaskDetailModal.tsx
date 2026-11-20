import { CalendarClock, Check, Clock, History, Link2, Pencil, Target, TimerOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { formatDateTime, formatMinutes } from '@/lib/utils';
import type { Task } from '@/lib/types';

export function TaskDetailModal({
  open,
  onClose,
  task,
  onEdit,
  onComplete,
  onPostpone,
}: {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  onEdit: (task: Task) => void;
  onComplete: (task: Task) => void;
  onPostpone: (task: Task) => void;
}) {
  if (!task) return null;
  const isCompleted = Boolean(task.completedAt) || task.storedStatus === 'completed';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Task details"
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={onClose} className="sm:order-1">
            Close
          </Button>
          <div className="flex flex-wrap justify-end gap-2 sm:order-2">
            {!isCompleted ? (
              <>
                <Button
                  variant="secondary"
                  size="md"
                  icon={<CalendarClock className="h-4 w-4" />}
                  onClick={() => onPostpone(task)}
                >
                  Postpone
                </Button>
                <Button
                  variant="success"
                  size="md"
                  icon={<Check className="h-4 w-4" />}
                  onClick={() => onComplete(task)}
                >
                  Complete
                </Button>
              </>
            ) : null}
            <Button
              variant="outline"
              size="md"
              icon={<Pencil className="h-4 w-4" />}
              onClick={() => onEdit(task)}
            >
              Edit
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-slate-400">
              {task.category}
            </span>
          </div>
          <h3 className="mt-2.5 font-display text-xl font-semibold leading-snug text-slate-100">
            {task.title}
          </h3>
          {task.goalTitle ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-accent-300">
              <Target className="h-3.5 w-3.5" aria-hidden />
              {task.goalTitle}
            </p>
          ) : null}
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
            {task.description || 'No description added.'}
          </p>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Deadline" value={formatDateTime(task.deadline)} icon={CalendarClock} />
          <Metric label="Estimated" value={formatMinutes(task.estimatedDuration)} icon={Clock} />
          <Metric label="Actual time" value={formatMinutes(task.actualDuration)} icon={Clock} />
          <Metric
            label="Postponements"
            value={String(task.postponeCount)}
            icon={History}
            tone={task.postponeCount > 0 ? 'text-amber-300' : undefined}
          />
          <Metric
            label="Total delay"
            value={formatMinutes(task.delayMinutes)}
            icon={TimerOff}
            tone={task.delayMinutes > 0 ? 'text-rose-300' : undefined}
          />
          <Metric
            label="Estimated lost work"
            value={formatMinutes(task.estimatedLostMinutes)}
            icon={TimerOff}
            tone={task.estimatedLostMinutes > 0 ? 'text-rose-300' : undefined}
          />
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <Link2 className="h-3 w-3" /> Created {formatDateTime(task.createdAt)}
          </span>
          {task.completedAt ? (
            <span className="flex items-center gap-1.5 text-emerald-400/80">
              <Check className="h-3 w-3" /> Completed {formatDateTime(task.completedAt)}
            </span>
          ) : null}
          {task.originalDeadline ? (
            <span>Original deadline {formatDateTime(task.originalDeadline)}</span>
          ) : null}
        </div>

        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Postponement ledger
            </h4>
            <span className="text-[11px] text-slate-500">{task.records.length} entries</span>
          </div>
          {task.records.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-4 text-xs text-slate-500">
              No postponements recorded. The deadline still means what it said.
            </p>
          ) : (
            <ol className="space-y-2.5">
              {task.records.map((record, index) => (
                <li
                  key={record.id}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.06] text-[9px] font-semibold text-slate-400">
                        {index + 1}
                      </span>
                      <span>{formatDateTime(record.createdAt)}</span>
                    </div>
                    <span className="rounded-full border border-amber-500/20 bg-amber-500/[0.08] px-2 py-0.5 text-[10px] font-medium text-amber-300">
                      +{formatMinutes(record.extensionMinutes)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">
                    <span className="text-slate-500">{formatDateTime(record.previousDeadline)}</span>
                    <span className="mx-2 text-slate-600">→</span>
                    <span className="text-slate-200">{formatDateTime(record.newDeadline)}</span>
                  </p>
                  {record.reason ? (
                    <p className="mt-1.5 text-xs italic leading-relaxed text-slate-500">
                      “{record.reason}”
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Clock;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </p>
      <p className={`mt-1 text-sm font-medium ${tone ?? 'text-slate-200'}`}>{value}</p>
    </div>
  );
}
