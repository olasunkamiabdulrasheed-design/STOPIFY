import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Pencil,
  Quote,
  RefreshCw,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Badge, SourceBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageSkeleton, ErrorState } from '@/components/ui/Loading';
import { useWorkspace } from '@/context/WorkspaceContext';
import { toastError } from '@/lib/toast';
import { formatDateKey } from '@/lib/utils';
import { dayKey, formatLongDayKey } from '@/services/dates';
import { SIMULATED_SUMMARY_NOTICE } from '@/services/reflectionSummary';
import type { Reflection } from '@/lib/types';

const emptyForm = {
  completedTasks: '',
  unfinishedTasks: '',
  postponementReasons: '',
  learnings: '',
  tomorrowGoals: '',
};

type FormState = typeof emptyForm;

export function ReflectionPage() {
  const { snapshot, loading, error, actions } = useWorkspace();
  const today = dayKey(new Date());
  const [date, setDate] = useState(today);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [generateSummary, setGenerateSummary] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reflection | null>(null);
  const [deleting, setDeleting] = useState(false);

  const context = useMemo(() => {
    if (!snapshot) return null;
    return actions.getReflectionContext(date);
  }, [snapshot, date, actions]);

  const currentReflection = useMemo(() => {
    if (!snapshot) return null;
    return snapshot.reflections.find((reflection) => reflection.reflectionDate === date) ?? null;
  }, [snapshot, date]);

  useEffect(() => {
    if (!context) return;
    const existing = context.existing;
    setForm(
      existing
        ? {
            completedTasks: existing.completedTasks,
            unfinishedTasks: existing.unfinishedTasks,
            postponementReasons: existing.postponementReasons,
            learnings: existing.learnings,
            tomorrowGoals: existing.tomorrowGoals,
          }
        : emptyForm,
    );
    setGenerateSummary(!existing?.aiSummary);
    // Only reinitialise when switching to a different saved reflection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, context?.existing?.id]);

  if (loading) return <PageSkeleton />;
  if (error || !snapshot || !context) {
    return <ErrorState message={error ?? 'Could not load reflections.'} />;
  }

  const reflections = snapshot.reflections;
  const hasContent = Object.values(form).some((value) => value.trim().length > 0);

  function update(field: keyof FormState, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function insert(field: keyof FormState, value: string) {
    if (!value.trim()) return;
    update(field, form[field].trim() ? `${form[field].trim()}\n${value.trim()}` : value.trim());
  }

  function focusForm() {
    document.getElementById('reflection-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function editReflection(reflection: Reflection) {
    setDate(reflection.reflectionDate);
    setSelected(reflection.id);
    focusForm();
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!hasContent) {
      toast.error('Write at least one line before saving.');
      return;
    }
    setSaving(true);
    try {
      const next = await actions.saveReflection({
        date,
        ...form,
        generateSummary,
      });
      const saved = next.reflections.find((reflection) => reflection.reflectionDate === date);
      if (saved) setSelected(saved.id);
      toast.success(
        generateSummary
          ? 'Reflection saved with a local simulated summary.'
          : 'Reflection saved.',
      );
    } catch (caught) {
      toastError(caught);
    } finally {
      setSaving(false);
    }
  }

  async function regenerate(reflection: Reflection) {
    setRegeneratingId(reflection.id);
    try {
      await actions.regenerateReflectionSummary(reflection.id);
      setSelected(reflection.id);
      toast.success('Summary regenerated locally.');
    } catch (caught) {
      toastError(caught);
    } finally {
      setRegeneratingId(null);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await actions.deleteReflection(deleteTarget.id);
      toast.success('Reflection deleted.');
      setDeleteTarget(null);
      setSelected(null);
    } catch (caught) {
      toastError(caught);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Close the loop"
        title="Daily Reflection"
        description="Three honest minutes about what moved, what stalled and what comes next. Summaries are simulated locally from your own words."
        actions={
          <Link to="/insights" className={buttonStyles('secondary', 'md')}>
            <Clock className="h-4 w-4" aria-hidden />
            Review your delay
          </Link>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
        <form id="reflection-form" onSubmit={save} className="surface space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-100">
                {currentReflection ? 'Edit this day' : 'Today’s check-in'}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Saved reflections are part of your workspace record.
              </p>
            </div>
            {currentReflection ? (
              <Badge tone="emerald">Saved</Badge>
            ) : (
              <Badge tone="slate">Not saved</Badge>
            )}
          </div>

          <Field label="Reflection date" htmlFor="reflection-date" required>
            <Input
              id="reflection-date"
              type="date"
              value={date}
              max={today}
              onChange={(event) => {
                if (event.target.value) setDate(event.target.value);
              }}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-300">What moved?</span>
                {context.completed.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => insert('completedTasks', context.completed.map((task) => task.title).join('\n'))}
                    className="text-[10px] font-medium text-accent-300 hover:text-accent-200"
                  >
                    Insert completed tasks
                  </button>
                ) : null}
              </div>
              <Textarea
                value={form.completedTasks}
                onChange={(event) => update('completedTasks', event.target.value)}
                placeholder="One finished thing, however small…"
                maxLength={4000}
                aria-label="Completed tasks"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-300">What stalled?</span>
                {context.openTasks.length > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      insert(
                        'unfinishedTasks',
                        context.openTasks.slice(0, 5).map((task) => task.title).join('\n'),
                      )
                    }
                    className="text-[10px] font-medium text-accent-300 hover:text-accent-200"
                  >
                    Insert open tasks
                  </button>
                ) : null}
              </div>
              <Textarea
                value={form.unfinishedTasks}
                onChange={(event) => update('unfinishedTasks', event.target.value)}
                placeholder="What did not happen, and what is the honest next step?"
                maxLength={4000}
                aria-label="Unfinished tasks"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-300">Why did deadlines move?</span>
              {context.postponed.length > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    insert(
                      'postponementReasons',
                      context.postponed
                        .map((record) => `${record.title}: ${record.reason || 'No reason recorded'}`)
                        .join('\n'),
                    )
                  }
                  className="text-[10px] font-medium text-accent-300 hover:text-accent-200"
                >
                  Insert today’s recorded reasons
                </button>
              ) : null}
            </div>
            <Textarea
              value={form.postponementReasons}
              onChange={(event) => update('postponementReasons', event.target.value)}
              placeholder="No excuse required — just the real reason. Pattern first, judgment later."
              maxLength={4000}
              aria-label="Postponement reasons"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-300">
              What did you learn about how you work?
            </span>
            <Textarea
              value={form.learnings}
              onChange={(event) => update('learnings', event.target.value)}
              placeholder="e.g. I plan around the task, not around my actual energy."
              maxLength={4000}
              aria-label="Learnings"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-300">What is tomorrow’s one thing?</span>
              {context.suggestedTomorrowGoals ? (
                <button
                  type="button"
                  onClick={() => insert('tomorrowGoals', context.suggestedTomorrowGoals)}
                  className="text-[10px] font-medium text-accent-300 hover:text-accent-200"
                >
                  Use suggestion
                </button>
              ) : null}
            </div>
            <Textarea
              value={form.tomorrowGoals}
              onChange={(event) => update('tomorrowGoals', event.target.value)}
              placeholder="Name one task and when it will happen. Not a wish list."
              maxLength={4000}
              aria-label="Tomorrow goals"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3">
            <input
              type="checkbox"
              checked={generateSummary}
              onChange={(event) => setGenerateSummary(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent accent-violet-500"
            />
            <span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
                <Sparkles className="h-3.5 w-3.5 text-accent-300" aria-hidden />
                Generate a simulated summary
              </span>
              <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">
                A local rules engine reflects your words back with relevant task data. No AI provider
                is called.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-4">
            <Button type="submit" loading={saving} disabled={!hasContent} icon={<BookOpen className="h-4 w-4" />}>
              {currentReflection ? 'Update reflection' : 'Save reflection'}
            </Button>
            {currentReflection ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setForm({
                    completedTasks: currentReflection.completedTasks,
                    unfinishedTasks: currentReflection.unfinishedTasks,
                    postponementReasons: currentReflection.postponementReasons,
                    learnings: currentReflection.learnings,
                    tomorrowGoals: currentReflection.tomorrowGoals,
                  });
                  setGenerateSummary(!currentReflection.aiSummary);
                }}
              >
                Reset edits
              </Button>
            ) : null}
            <span className="ml-auto text-[10px] text-slate-600">
              {Object.values(form).reduce((total, value) => total + value.trim().length, 0)} characters
            </span>
          </div>
        </form>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-100">
                  Evidence for {date === today ? 'today' : formatDateKey(date)}
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">{formatLongDayKey(date)}</p>
              </div>
              <Badge tone="violet">Local data</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ContextStat label="Completed" value={context.stats.completedOnDate} tone="emerald" />
              <ContextStat label="Open" value={context.stats.open} tone="slate" />
              <ContextStat label="Overdue" value={context.stats.overdue} tone="rose" />
              <ContextStat label="Postponed" value={context.stats.postponeEvents} tone="amber" />
            </div>

            {context.completed.length > 0 ? (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Finished that day</p>
                <ul className="mt-1.5 space-y-1">
                  {context.completed.map((task) => (
                    <li key={task.id} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" aria-hidden />
                      <span className="line-clamp-2">{task.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {context.postponed.length > 0 ? (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Moved that day</p>
                <ul className="mt-1.5 space-y-1.5">
                  {context.postponed.map((record) => (
                    <li key={record.id} className="text-[11px] leading-relaxed text-slate-400">
                      <span className="line-clamp-1 font-medium text-slate-300">{record.title}</span>
                      <span className="block text-[10px] text-slate-500">
                        {record.reason || 'No reason recorded'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {context.openTasks.length > 0 ? (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Still open</p>
                <ul className="mt-1.5 space-y-1">
                  {context.openTasks.slice(0, 4).map((task) => (
                    <li key={task.id} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                      <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" aria-hidden />
                      <span className="line-clamp-2">
                        {task.title}
                        {task.postponeCount > 0 ? (
                          <span className="text-amber-400/80"> · {task.postponeCount}× moved</span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[10px] leading-relaxed text-slate-500">
              <Sparkles className="mr-1 inline h-3 w-3 text-accent-300" aria-hidden />
              Suggested tomorrow: {context.suggestedTomorrowGoals || 'Add an open task to get a suggestion.'}
            </p>
          </Card>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-amber-200">
              <Quote className="h-3.5 w-3.5" aria-hidden />
              Simulated summaries
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-amber-200/70">
              {SIMULATED_SUMMARY_NOTICE}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">Reflection history</h2>
            <p className="mt-1 text-xs text-slate-400">
              {reflections.length} saved {reflections.length === 1 ? 'entry' : 'entries'} across this
              workspace.
            </p>
          </div>
          {reflections.length > 0 ? (
            <Badge tone="emerald">
              {reflections.filter((reflection) => reflection.aiSummary).length} with summaries
            </Badge>
          ) : null}
        </div>

        {reflections.length === 0 ? (
          <div className="surface px-4 py-8 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-slate-600" aria-hidden />
            <p className="mt-3 font-display text-sm font-semibold text-slate-300">
              No reflections saved yet
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
              The first entry is the hardest. Write what actually happened today — including the part
              you would rather not mention.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {reflections.map((reflection) => {
              const expanded = selected === reflection.id;
              return (
                <Card key={reflection.id} className="overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSelected(expanded ? null : reflection.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.02]"
                    aria-expanded={expanded}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400">
                        <BookOpen className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-slate-200">
                            {formatLongDayKey(reflection.reflectionDate)}
                          </p>
                          {reflection.summarySource ? (
                            <SourceBadge source={reflection.summarySource} />
                          ) : (
                            <Badge tone="slate">No summary</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                          {reflection.completedTasks ||
                            reflection.learnings ||
                            reflection.unfinishedTasks ||
                            'Empty reflection'}
                        </p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[10px] text-slate-500">
                      {reflection.reflectionDate === today ? 'Today' : ''}
                      {expanded ? (
                        <ChevronUp className="h-4 w-4" aria-hidden />
                      ) : (
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      )}
                    </span>
                  </button>

                  {expanded ? (
                    <div className="border-t border-white/[0.07] px-4 py-4">
                      {reflection.aiSummary ? (
                        <div className="rounded-xl border border-accent-400/15 bg-accent-500/[0.04] p-4">
                          <div className="flex items-center justify-between gap-2">
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-200">
                              <Sparkles className="h-3.5 w-3.5" aria-hidden />
                              Simulated summary
                            </p>
                            <span className="text-[10px] text-slate-500">
                              {new Date(reflection.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-slate-300">
                            {reflection.aiSummary}
                          </p>
                        </div>
                      ) : (
                        <p className="rounded-xl border border-dashed border-white/10 px-4 py-4 text-center text-[11px] text-slate-500">
                          No simulated summary has been generated for this reflection.
                        </p>
                      )}

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <HistoryBlock label="What moved" value={reflection.completedTasks} />
                        <HistoryBlock label="What stalled" value={reflection.unfinishedTasks} />
                        <HistoryBlock label="Why it moved" value={reflection.postponementReasons} />
                        <HistoryBlock label="Learned" value={reflection.learnings} />
                      </div>
                      <HistoryBlock label="Tomorrow’s one thing" value={reflection.tomorrowGoals} className="mt-3" />

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Pencil className="h-3.5 w-3.5" />}
                          onClick={() => editReflection(reflection)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<RefreshCw className="h-3.5 w-3.5" />}
                          loading={regeneratingId === reflection.id}
                          onClick={() => void regenerate(reflection)}
                        >
                          Regenerate summary
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="h-3.5 w-3.5" />}
                          className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                          onClick={() => setDeleteTarget(reflection)}
                        >
                          Delete
                        </Button>
                        <span className="ml-auto text-[10px] text-slate-600">
                          {new Date(reflection.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete this reflection?"
        description={
          deleteTarget
            ? `The entry for ${formatLongDayKey(deleteTarget.reflectionDate)} and its summary will be removed permanently.`
            : 'This entry and its summary will be removed permanently.'
        }
        confirmLabel="Delete reflection"
        destructive
      />
    </div>
  );
}

function ContextStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'emerald' | 'slate' | 'rose' | 'amber';
}) {
  const color = {
    emerald: 'text-emerald-300',
    slate: 'text-slate-300',
    rose: 'text-rose-300',
    amber: 'text-amber-300',
  }[tone];
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
      <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 font-display text-lg font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function HistoryBlock({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-slate-400">
        {value || '—'}
      </p>
    </div>
  );
}
