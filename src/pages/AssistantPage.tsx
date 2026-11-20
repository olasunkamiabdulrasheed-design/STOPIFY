import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  CalendarClock,
  Clock,
  Eraser,
  MessageSquare,
  Send,
  ShieldAlert,
  Sparkles,
  Target,
  TimerOff,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SourceBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageSkeleton, ErrorState } from '@/components/ui/Loading';
import { useWorkspace } from '@/context/WorkspaceContext';
import { toastError } from '@/lib/toast';
import { deadlineInfo, formatMinutes } from '@/lib/utils';

const QUICK_PROMPTS = [
  {
    icon: TimerOff,
    label: 'What should I do next?',
    prompt: 'What should I do next?',
  },
  {
    icon: MessageSquare,
    label: 'Why do I keep postponing?',
    prompt: 'Why do I keep postponing the same task?',
  },
  {
    icon: Clock,
    label: 'What is the delay costing me?',
    prompt: 'What is my delay costing me?',
  },
  {
    icon: CalendarClock,
    label: 'Help me plan tomorrow',
    prompt: 'Help me plan tomorrow realistically.',
  },
  {
    icon: Sparkles,
    label: 'Break a task into steps',
    prompt: 'Break my next task into smaller steps.',
  },
  {
    icon: Target,
    label: 'Analyse my week',
    prompt: 'Analyse my productivity this week.',
  },
];

export function AssistantPage() {
  const { snapshot, loading, error, actions } = useWorkspace();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = snapshot?.conversation ?? [];
  const lastMessageCount = messages.length;

  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [lastMessageCount, pendingMessage, sending]);

  const focusTask = useMemo(() => {
    if (!snapshot) return null;
    return (
      [...snapshot.tasks]
        .filter((task) => !task.completedAt)
        .sort((a, b) => {
          const statusA = a.status === 'overdue' ? 1 : 0;
          const statusB = b.status === 'overdue' ? 1 : 0;
          if (statusA !== statusB) return statusB - statusA;
          return b.currentOverdueMinutes - a.currentOverdueMinutes;
        })[0] ?? null
    );
  }, [snapshot]);

  if (loading) return <PageSkeleton />;
  if (error || !snapshot) {
    return <ErrorState message={error ?? 'Could not load the assistant.'} />;
  }

  const riskyGoal = snapshot.insights.goalImpact.find((goal) => goal.atRisk);

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    if (trimmed.length > 1200) {
      toast.error('Keep the message under 1,200 characters.');
      return;
    }
    setSending(true);
    setPendingMessage(trimmed);
    setInput('');
    try {
      await actions.sendAssistantMessage(trimmed);
      setPendingMessage(null);
      inputRef.current?.focus();
    } catch (caught) {
      setPendingMessage(null);
      setInput(trimmed);
      toastError(caught);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send(input);
    }
  }

  async function clearConversation() {
    setClearing(true);
    try {
      await actions.clearConversation();
      toast.success('Conversation cleared.');
      setClearOpen(false);
    } catch (caught) {
      toastError(caught);
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Simulated coach"
        title="AI Assistant"
        description="A local coaching layer over your own task records. It can sequence work, surface patterns and explain consequences — without sending anything to an AI provider."
        actions={
          messages.length > 0 ? (
            <Button
              variant="ghost"
              onClick={() => setClearOpen(true)}
              icon={<Eraser className="h-4 w-4" />}
            >
              Clear chat
            </Button>
          ) : null
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_310px]">
        <Card className="flex min-h-[600px] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] bg-white/[0.015] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-accent-400/25 bg-accent-500/10 text-accent-300">
                <Bot className="h-[18px] w-[18px]" aria-hidden />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-950 bg-emerald-400" />
              </span>
              <div>
                <p className="font-display text-sm font-semibold text-slate-100">STOPIFY Coach</p>
                <p className="text-[10px] text-slate-500">Local rules engine · simulated replies</p>
              </div>
            </div>
            <SourceBadge source="simulated" />
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6"
            aria-live="polite"
          >
            {messages.length === 0 && !pendingMessage ? (
              <div className="mx-auto flex max-w-xl flex-col items-center py-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-400/25 bg-accent-500/10 text-accent-300 shadow-glow">
                  <Sparkles className="h-6 w-6" aria-hidden />
                </span>
                <h2 className="mt-4 font-display text-lg font-semibold text-slate-100">
                  Start with the real question
                </h2>
                <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-400">
                  I read this workspace’s tasks, deadlines, postponement reasons and reflections.
                  Answers are generated locally by a rules engine — useful, but not a language model.
                </p>
                <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
                  {QUICK_PROMPTS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => void send(item.prompt)}
                        className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-left transition hover:border-accent-400/30 hover:bg-accent-500/[0.06]"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-accent-300" aria-hidden />
                        <span className="text-[11px] font-medium leading-snug text-slate-300">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-2.5 ${
                      message.role === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                        message.role === 'user'
                          ? 'border-white/10 bg-white/[0.06] text-slate-300'
                          : 'border-accent-400/25 bg-accent-500/10 text-accent-300'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Bot className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </span>
                    <div className={`max-w-[85%] ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div
                        className={`inline-block whitespace-pre-line rounded-2xl border px-3.5 py-2.5 text-left text-xs leading-relaxed ${
                          message.role === 'user'
                            ? 'border-white/10 bg-white/[0.07] text-slate-200'
                            : 'border-white/[0.07] bg-[#101019] text-slate-300'
                        }`}
                      >
                        {message.content}
                      </div>
                      <p className="mt-1 text-[10px] text-slate-600">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {message.role === 'assistant' && message.source ? ' · simulated' : ''}
                      </p>
                    </div>
                  </div>
                ))}
                {pendingMessage ? (
                  <>
                    <div className="flex flex-row-reverse items-start gap-2.5">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-slate-300">
                        <User className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <div className="inline-block max-w-[85%] rounded-2xl border border-white/10 bg-white/[0.07] px-3.5 py-2.5 text-xs leading-relaxed text-slate-200">
                        {pendingMessage}
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent-400/25 bg-accent-500/10 text-accent-300">
                        <Bot className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <div className="flex items-center gap-1.5 rounded-2xl border border-white/[0.07] bg-[#101019] px-3.5 py-3">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-400" />
                        <span
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-400"
                          style={{ animationDelay: '120ms' }}
                        />
                        <span
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-400"
                          style={{ animationDelay: '240ms' }}
                        />
                        <span className="ml-1 text-[10px] text-slate-500">reading your workspace</span>
                      </div>
                    </div>
                  </>
                ) : null}
              </>
            )}
          </div>

          <div className="border-t border-white/[0.07] bg-white/[0.015] p-3 sm:p-4">
            {messages.length > 0 && !pendingMessage ? (
              <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
                {QUICK_PROMPTS.slice(0, 3).map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => void send(item.prompt)}
                    disabled={sending}
                    className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-slate-400 transition hover:border-accent-400/30 hover:text-accent-200 disabled:opacity-50"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
            <form onSubmit={onSubmit} className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
                rows={2}
                maxLength={1200}
                disabled={sending}
                placeholder="Ask about next steps, delay patterns, goals or your plan…"
                className="field-base min-h-[46px] flex-1 resize-none py-2.5 text-xs"
                aria-label="Message the simulated coach"
              />
              <Button
                type="submit"
                size="md"
                loading={sending}
                disabled={!input.trim()}
                icon={<Send className="h-4 w-4" />}
                className="mb-0.5"
              >
                Send
              </Button>
            </form>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
              Press Enter to send, Shift+Enter for a new line. Responses are simulated locally and
              can be wrong — verify against the task ledger.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-accent-300" aria-hidden />
              <h2 className="font-display text-sm font-semibold text-slate-100">What I can see</h2>
            </div>
            <div className="mt-3 space-y-2">
              <ContextRow label="Open tasks" value={String(snapshot.summary.pending)} />
              <ContextRow label="Overdue" value={String(snapshot.summary.overdue)} />
              <ContextRow
                label="Recorded delay"
                value={formatMinutes(snapshot.summary.totalDelayMinutes)}
              />
              <ContextRow
                label="Current streak"
                value={`${snapshot.summary.currentStreak} days`}
              />
            </div>
            {focusTask ? (
              <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Most urgent</p>
                <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-200">
                  {focusTask.title}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {deadlineInfo(focusTask.deadline).label}
                </p>
              </div>
            ) : null}
            {riskyGoal ? (
              <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-amber-300/80">Goal at risk</p>
                <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-200">
                  {riskyGoal.title}
                </p>
              </div>
            ) : null}
            <Link
              to="/insights"
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-accent-300 hover:text-accent-200"
            >
              Open the delay ledger <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-sm font-semibold text-slate-100">Useful questions</h2>
            <div className="mt-3 space-y-1.5">
              {[
                'What should I do next?',
                'Why do I keep postponing?',
                'What is my delay costing me?',
                'How are my goals doing?',
                'Help me plan tomorrow',
              ].map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => void send(question)}
                  disabled={sending}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200 disabled:opacity-50"
                >
                  {question}
                  <ArrowRight className="h-3 w-3 shrink-0" aria-hidden />
                </button>
              ))}
            </div>
          </Card>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-amber-200">
              <ShieldAlert className="h-4 w-4" aria-hidden />
              Demo honesty
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-amber-200/70">
              This assistant is a deterministic rules engine. It does not call an LLM, does not learn
              from you, and cannot browse. Replies come from your own workspace data.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={clearConversation}
        loading={clearing}
        title="Clear this conversation?"
        description="Every message in this workspace will be removed. Your tasks, plans and reflections stay intact."
        confirmLabel="Clear conversation"
        destructive
      />
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-1.5 last:border-b-0">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className="text-[11px] font-medium tabular-nums text-slate-300">{value}</span>
    </div>
  );
}
