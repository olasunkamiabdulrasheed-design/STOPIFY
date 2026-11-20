import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
  History,
  ListChecks,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Timer,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Badge, SourceBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSkeleton, ErrorState } from '@/components/ui/Loading';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { TaskFormModal, CompleteTaskModal, PostponeModal } from '@/components/tasks/TaskModals';
import { useWorkspace } from '@/context/WorkspaceContext';
import { formatDateKey, formatMinutes } from '@/lib/utils';
import { dayKey, formatLongDayKey } from '@/services/dates';
import { toastError } from '@/lib/toast';
import type { Plan, PlanItem, Task } from '@/lib/types';

export function PlannerPage() {
  const { snapshot, loading, error, actions } = useWorkspace();
  const today = dayKey(new Date());
  const [date, setDate] = useState(today);
  const [minutes, setMinutes] = useState('');
  const [focusText, setFocusText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    id: string;
    title: string;
    duration: string;
  } | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [deletePlan, setDeletePlan] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [completeTask, setCompleteTask] = useState<Task | null>(null);
  const [postponeTask, setPostponeTask] = useState<Task | null>(null);
  const [formTask, setFormTask] = useState<Task | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);

  const selectedPlan = useMemo(() => {
    if (!snapshot) return null;
    return snapshot.plans.find((plan) => plan.id === selectedId) ?? snapshot.plans[0] ?? null;
  }, [snapshot, selectedId]);

  useEffect(() => {
    if (!snapshot) return;
    if (selectedId && snapshot.plans.some((plan) => plan.id === selectedId)) return;
    const todays = snapshot.plans.find((plan) => plan.planDate === today);
    setSelectedId(todays?.id ?? snapshot.plans[0]?.id ?? null);
  }, [snapshot, selectedId, today]);

  useEffect(() => {
    setNotes(selectedPlan?.plan.notes ?? '');
  }, [selectedPlan?.id, selectedPlan?.plan.notes]);

  useEffect(() => {
    if (snapshot && !minutes) {
      setMinutes(String(snapshot.preferences.defaultPlanMinutes));
    }
  }, [snapshot, minutes]);

  if (loading) return <PageSkeleton />;
  if (error || !snapshot) {
    return <ErrorState message={error ?? 'Could not load the planner.'} />;
  }

  const openTasks = snapshot.tasks.filter((task) => !task.completedAt);

  async function runGeneration(
    planDate: string,
    availableMinutes: number,
    focus: string,
    successMessage: string,
  ) {
    setGenerating(true);
    try {
      const next = await actions.generatePlan({
        date: planDate,
        availableMinutes,
        focusText: focus,
      });
      const latest = next.plans.find((plan) => plan.planDate === planDate);
      if (latest) setSelectedId(latest.id);
      toast.success(successMessage);
    } catch (caught) {
      toastError(caught);
    } finally {
      setGenerating(false);
    }
  }

  async function onGenerate(event: FormEvent) {
    event.preventDefault();
    const value = Number(minutes);
    if (!Number.isFinite(value) || value < 30 || value > 720) {
      toast.error('Choose between 30 and 720 minutes.');
      return;
    }
    await runGeneration(date, value, focusText, 'Simulated plan generated from your tasks.');
  }

  async function regeneratePlan() {
    if (!selectedPlan) return;
    await runGeneration(
      selectedPlan.planDate,
      selectedPlan.availableMinutes,
      focusText,
      'Plan regenerated from the same inputs.',
    );
  }

  async function toggleItem(itemId: string) {
    if (!selectedPlan) return;
    try {
      await actions.togglePlanItem(selectedPlan.id, itemId);
    } catch (caught) {
      toastError(caught);
    }
  }

  async function saveNotes() {
    if (!selectedPlan) return;
    setSavingNotes(true);
    try {
      await actions.updatePlanNotes(selectedPlan.id, notes);
      toast.success('Plan notes saved.');
    } catch (caught) {
      toastError(caught);
    } finally {
      setSavingNotes(false);
    }
  }

  async function acceptPlan() {
    if (!selectedPlan) return;
    setAccepting(true);
    try {
      await actions.acceptPlan(selectedPlan.id);
      toast.success('Plan accepted. Protect these blocks.');
    } catch (caught) {
      toastError(caught);
    } finally {
      setAccepting(false);
    }
  }

  async function moveItem(itemId: string, direction: 'up' | 'down') {
    if (!selectedPlan) return;
    try {
      await actions.movePlanItem(selectedPlan.id, itemId, direction);
    } catch (caught) {
      toastError(caught);
    }
  }

  function startEditing(item: PlanItem) {
    setEditingItem({
      id: item.id,
      title: item.title,
      duration: String(item.durationMinutes),
    });
  }

  async function saveItemEdit() {
    if (!selectedPlan || !editingItem) return;
    const title = editingItem.title.trim();
    const duration = Number(editingItem.duration);
    if (!title) {
      toast.error('Give the block a title.');
      return;
    }
    if (!Number.isFinite(duration) || duration < 5 || duration > 240) {
      toast.error('Blocks must run between 5 and 240 minutes.');
      return;
    }

    setSavingItem(true);
    try {
      await actions.updatePlanItem(selectedPlan.id, editingItem.id, {
        title,
        durationMinutes: duration,
      });
      toast.success('Block updated and the rest of the day re-flowed.');
      setEditingItem(null);
    } catch (caught) {
      toastError(caught);
    } finally {
      setSavingItem(false);
    }
  }

  async function onDeletePlan() {
    if (!deletePlan) return;
    setDeleting(true);
    try {
      await actions.deletePlan(deletePlan.id);
      toast.success('Plan deleted.');
      setDeletePlan(null);
      setSelectedId(null);
    } catch (caught) {
      toastError(caught);
    } finally {
      setDeleting(false);
    }
  }

  function openCreateTask() {
    setFormTask(null);
    setTaskFormOpen(true);
  }

  const focusMinutes =
    selectedPlan?.plan.items
      .filter((item) => item.kind === 'focus')
      .reduce((total, item) => total + item.durationMinutes, 0) ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Simulated planning"
        title="Daily Planner"
        description="Turn the work you already committed to into a realistic sequence of blocks. Generated locally from your tasks, focus window and available time."
        actions={
          <Button
            variant="secondary"
            icon={<Plus className="h-4 w-4" />}
            onClick={openCreateTask}
          >
            Add task
          </Button>
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent-400/25 bg-accent-500/10 text-accent-300">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-100">Generate a plan</h2>
                <p className="text-[11px] text-slate-500">Simulated · no external AI</p>
              </div>
            </div>

            <form onSubmit={onGenerate} className="mt-4 space-y-4">
              <Field label="Plan date" htmlFor="plan-date">
                <Input
                  id="plan-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </Field>
              <Field
                label="Available minutes"
                htmlFor="plan-minutes"
                hint={`Focus window ${snapshot.preferences.focusStart}–${snapshot.preferences.focusEnd}`}
              >
                <Input
                  id="plan-minutes"
                  type="number"
                  min={30}
                  max={720}
                  step={15}
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  required
                />
              </Field>
              <Field
                label="What deserves the best hours?"
                htmlFor="plan-focus"
                hint="Optional. Tasks matching these words are prioritised."
              >
                <Input
                  id="plan-focus"
                  value={focusText}
                  onChange={(event) => setFocusText(event.target.value)}
                  placeholder="e.g. dissertation, statistics"
                  maxLength={120}
                />
              </Field>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-[11px] leading-relaxed text-slate-400">
                <p className="flex items-center gap-1.5 font-medium text-slate-300">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-300" aria-hidden />
                  How this works
                </p>
                <p className="mt-1.5">
                  Blocks are built from your open tasks, urgency and estimates. Breaks and buffers are
                  added automatically. Nothing is sent to an AI provider — this is a deterministic demo
                  engine.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={generating}
                disabled={openTasks.length === 0}
                icon={<Sparkles className="h-4 w-4" />}
              >
                {generating ? 'Building your plan…' : 'Generate simulated plan'}
              </Button>
              {openTasks.length === 0 ? (
                <p className="text-center text-[11px] text-slate-500">
                  Add an open task to generate a useful plan.
                </p>
              ) : null}
            </form>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-semibold text-slate-100">Plan history</h2>
              <Badge tone="slate">{snapshot.plans.length}</Badge>
            </div>
            <div className="mt-3 space-y-1.5">
              {snapshot.plans.length === 0 ? (
                <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-center text-[11px] text-slate-500">
                  No plans generated yet.
                </p>
              ) : (
                snapshot.plans.slice(0, 12).map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedId(plan.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition ${
                      selectedPlan?.id === plan.id
                        ? 'border-accent-400/30 bg-accent-500/10'
                        : 'border-transparent hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-medium text-slate-300">
                        {plan.planDate === today ? 'Today' : formatDateKey(plan.planDate)}
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {plan.itemCount} blocks · {formatMinutes(plan.availableMinutes)}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {plan.doneCount}/{plan.itemCount}
                    </span>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {!selectedPlan ? (
            <EmptyState
              icon={CalendarClock}
              title="No plan selected"
              description="Generate a plan to see a focused, time-boxed day built from your real tasks."
              action={
                openTasks.length === 0 ? (
                  <Button onClick={openCreateTask} icon={<Plus className="h-4 w-4" />}>
                    Add your first task
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      const form = document.getElementById('plan-date');
                      form?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                  >
                    Use the planner form
                  </Button>
                )
              }
            />
          ) : (
            <>
              <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <SourceBadge source={selectedPlan.source} />
                      <Badge tone="slate">{formatLongDayKey(selectedPlan.planDate)}</Badge>
                      {selectedPlan.acceptedAt ? (
                        <Badge tone="emerald">Accepted</Badge>
                      ) : (
                        <Badge tone="amber">Not accepted yet</Badge>
                      )}
                    </div>
                    <h2 className="mt-2 font-display text-xl font-semibold text-slate-100">
                      {selectedPlan.doneCount}/{selectedPlan.itemCount} blocks done
                    </h2>
                    <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-slate-400">
                      {selectedPlan.plan.summary}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<RefreshCw className="h-3.5 w-3.5" />}
                      onClick={() => void regeneratePlan()}
                      loading={generating}
                      disabled={openTasks.length === 0}
                    >
                      Regenerate
                    </Button>
                    {selectedPlan.acceptedAt ? (
                      <Badge tone="emerald" title="You accepted this plan.">
                        <Check className="h-3 w-3" aria-hidden /> Accepted
                      </Badge>
                    ) : (
                      <Button
                        variant="success"
                        size="sm"
                        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                        onClick={() => void acceptPlan()}
                        loading={accepting}
                      >
                        Accept plan
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={() => setDeletePlan(selectedPlan)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <Metric icon={Clock} label="Focus blocks" value={`${focusMinutes} min`} />
                  <Metric
                    icon={Timer}
                    label="Capacity"
                    value={formatMinutes(selectedPlan.availableMinutes)}
                  />
                  <Metric
                    icon={History}
                    label="Generated"
                    value={new Date(selectedPlan.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  />
                </div>

                {selectedPlan.notice ? (
                  <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-3 text-[11px] leading-relaxed text-amber-200/80">
                    {selectedPlan.notice}
                  </p>
                ) : null}
              </Card>

              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-semibold text-slate-100">
                      The day, block by block
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Tick blocks off as you finish them. Breaks count too.
                    </p>
                  </div>
                  <Badge tone="violet">Simulated</Badge>
                </div>

                <div className="mt-4 space-y-2">
                  {selectedPlan.plan.items.map((item, index) => {
                    const linkedTask = item.taskId
                      ? snapshot.tasks.find((task) => task.id === item.taskId)
                      : null;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 transition ${
                          item.done
                            ? 'border-emerald-500/15 bg-emerald-500/[0.04]'
                            : item.kind === 'break'
                              ? 'border-sky-500/15 bg-sky-500/[0.025]'
                              : item.kind === 'buffer'
                                ? 'border-white/[0.06] bg-white/[0.015]'
                                : 'border-white/[0.07] bg-white/[0.03]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => void toggleItem(item.id)}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                            item.done
                              ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300'
                              : 'border-white/20 text-transparent hover:border-emerald-400 hover:text-emerald-400'
                          }`}
                          aria-label={item.done ? `Mark ${item.title} not done` : `Mark ${item.title} done`}
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="w-[100px] shrink-0 text-[11px] tabular-nums text-slate-500">
                              {item.startTime}–{item.endTime}
                            </span>
                            {item.kind === 'break' ? (
                              <Coffee className="h-3.5 w-3.5 text-sky-300" aria-hidden />
                            ) : item.kind === 'buffer' ? (
                              <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                            ) : (
                              <ListChecks className="h-3.5 w-3.5 text-accent-300" aria-hidden />
                            )}
                            {editingItem?.id === item.id ? (
                              <div className="flex flex-1 flex-wrap items-center gap-1.5">
                                <Input
                                  aria-label="Block title"
                                  value={editingItem.title}
                                  onChange={(event) =>
                                    setEditingItem({ ...editingItem, title: event.target.value })
                                  }
                                  className="h-8 min-w-[140px] flex-1 py-1 text-xs"
                                  maxLength={160}
                                  autoFocus
                                />
                                <Input
                                  aria-label="Duration in minutes"
                                  type="number"
                                  min={5}
                                  max={240}
                                  step={5}
                                  value={editingItem.duration}
                                  onChange={(event) =>
                                    setEditingItem({ ...editingItem, duration: event.target.value })
                                  }
                                  className="h-8 w-20 py-1 text-xs"
                                />
                                <Button
                                  size="sm"
                                  className="h-8"
                                  loading={savingItem}
                                  onClick={() => void saveItemEdit()}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8"
                                  onClick={() => setEditingItem(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <>
                                <p
                                  className={`min-w-0 flex-1 text-xs font-medium ${
                                    item.done ? 'text-slate-500 line-through' : 'text-slate-200'
                                  }`}
                                >
                                  {item.title}
                                </p>
                                <span className="text-[10px] text-slate-500">
                                  {item.durationMinutes}m
                                </span>
                              </>
                            )}
                          </div>
                          {item.why ? (
                            <p className="mt-1 pl-[100px] text-[10px] leading-relaxed text-slate-500">
                              {item.why}
                            </p>
                          ) : null}
                          {item.steps.length > 0 ? (
                            <ul className="mt-1.5 space-y-0.5 pl-[100px]">
                              {item.steps.map((step, index) => (
                                <li key={index} className="text-[10px] leading-relaxed text-slate-500">
                                  · {step}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {linkedTask ? (
                            <button
                              type="button"
                              onClick={() => setDetailTask(linkedTask)}
                              className="mt-1.5 inline-flex items-center gap-1 pl-[100px] text-[10px] font-medium text-accent-300 hover:text-accent-200"
                            >
                              Open linked task <ArrowRight className="h-3 w-3" aria-hidden />
                            </button>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => void moveItem(item.id, 'up')}
                            disabled={index === 0}
                            aria-label={`Move ${item.title} earlier`}
                            className="rounded-md p-1 text-slate-500 transition hover:bg-white/[0.07] hover:text-slate-200 disabled:pointer-events-none disabled:opacity-30"
                          >
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => void moveItem(item.id, 'down')}
                            disabled={index === selectedPlan.plan.items.length - 1}
                            aria-label={`Move ${item.title} later`}
                            className="rounded-md p-1 text-slate-500 transition hover:bg-white/[0.07] hover:text-slate-200 disabled:pointer-events-none disabled:opacity-30"
                          >
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => startEditing(item)}
                            aria-label={`Edit ${item.title}`}
                            className="rounded-md p-1 text-slate-500 transition hover:bg-white/[0.07] hover:text-slate-200"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-base font-semibold text-slate-100">Plan notes</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      What will you protect, and what will you deliberately ignore?
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void saveNotes()}
                    loading={savingNotes}
                  >
                    Save notes
                  </Button>
                </div>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="e.g. Phone in another room until the first two blocks are done."
                  className="mt-3 min-h-[96px]"
                  maxLength={2000}
                />
              </Card>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Focus window {snapshot.preferences.focusStart}–
          {snapshot.preferences.focusEnd}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5" /> {openTasks.length} open tasks
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" /> {snapshot.summary.todayCompleted} completed today
        </span>
        <Link
          to="/tasks"
          className="ml-auto inline-flex items-center gap-1 font-medium text-accent-300 hover:text-accent-200"
        >
          Manage tasks <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>

      <TaskFormModal
        open={taskFormOpen}
        task={formTask}
        onClose={() => {
          setTaskFormOpen(false);
          setFormTask(null);
        }}
      />
      <TaskDetailModal
        open={Boolean(detailTask)}
        task={detailTask}
        onClose={() => setDetailTask(null)}
        onEdit={(task) => {
          setDetailTask(null);
          setFormTask(task);
          setTaskFormOpen(true);
        }}
        onComplete={(task) => {
          setDetailTask(null);
          setCompleteTask(task);
        }}
        onPostpone={(task) => {
          setDetailTask(null);
          setPostponeTask(task);
        }}
      />
      <CompleteTaskModal
        open={Boolean(completeTask)}
        task={completeTask}
        onClose={() => setCompleteTask(null)}
      />
      <PostponeModal
        open={Boolean(postponeTask)}
        task={postponeTask}
        onClose={() => setPostponeTask(null)}
      />
      <ConfirmDialog
        open={Boolean(deletePlan)}
        onClose={() => setDeletePlan(null)}
        onConfirm={onDeletePlan}
        loading={deleting}
        destructive
        title="Delete this plan?"
        description="The plan and its checked blocks will be removed. Your tasks and their records stay intact."
        confirmLabel="Delete plan"
      />
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-200">{value}</p>
    </div>
  );
}
