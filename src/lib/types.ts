export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type StoredTaskStatus = 'not_started' | 'in_progress' | 'completed' | 'postponed';
export type TaskStatus = StoredTaskStatus | 'overdue';
export type GoalStatus = 'active' | 'completed' | 'archived';
export type PlanSource = 'simulated';

export interface NotificationPreferences {
  email: boolean;
  weekly: boolean;
}

export interface Preferences {
  focusStart: string;
  focusEnd: string;
  dailyTarget: number;
  defaultPlanMinutes: number;
  notifications: NotificationPreferences;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Profile extends User {
  preferences: Preferences;
}

export interface PostponementView {
  id: string;
  previousDeadline: string | null;
  newDeadline: string | null;
  reason: string;
  createdAt: string;
  extensionMinutes: number;
}

export interface Task {
  id: string;
  goalId: string | null;
  goalTitle: string | null;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: TaskStatus;
  storedStatus: StoredTaskStatus;
  deadline: string | null;
  estimatedDuration: number | null;
  actualDuration: number | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  postponeCount: number;
  lastPostponedAt: string | null;
  originalDeadline: string | null;
  extensionMinutes: number;
  latenessMinutes: number;
  currentOverdueMinutes: number;
  delayMinutes: number;
  estimatedLostMinutes: number;
  isDelayed: boolean;
  records: PostponementView[];
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string | null;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  completedCount: number;
  delayedCount: number;
  overdueCount: number;
  progress: number;
  atRisk: boolean;
}

export interface PlanItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  priority: Priority;
  kind: 'focus' | 'break' | 'buffer';
  taskId: string | null;
  why: string;
  steps: string[];
  done: boolean;
}

export interface PlanContent {
  summary: string;
  items: PlanItem[];
  notes?: string;
}

export interface Plan {
  id: string;
  planDate: string;
  availableMinutes: number;
  source: PlanSource;
  plan: PlanContent;
  notice: string | null;
  createdAt: string;
  itemCount: number;
  doneCount: number;
  /** Set when the user explicitly accepts the generated plan. */
  acceptedAt?: string | null;
}

export interface Reflection {
  id: string;
  reflectionDate: string;
  completedTasks: string;
  unfinishedTasks: string;
  postponementReasons: string;
  learnings: string;
  tomorrowGoals: string;
  aiSummary: string | null;
  summarySource: PlanSource | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreComponent {
  key: string;
  label: string;
  value: number | null;
  weight: number;
  detail: string;
}

export interface ScoreResult {
  value: number | null;
  breakdown: ScoreComponent[];
  reason?: string;
}

export interface Summary {
  totalTasks: number;
  completed: number;
  pending: number;
  overdue: number;
  postponedOpen: number;
  postponedAny: number;
  completionRate: number;
  onTimeRate: number | null;
  onTimeCompleted: number;
  completedWithDeadline: number;
  postponeEvents: number;
  delayedTasks: number;
  totalDelayMinutes: number;
  averageDelayMinutes: number;
  estimatedLostMinutes: number;
  estimatedLostTaskCount: number;
  currentStreak: number;
  longestStreak: number;
  activeDaysLast14: number;
  completedLast7: number;
  completedPrev7: number;
  dueLast7: number;
  createdLast7: number;
  postponedLast7: number;
  overdueNow: number;
  todayCompleted: number;
  dueToday: number;
}

export interface DailyPoint {
  date: string;
  label: string;
  completed: number;
  due: number;
  missed: number;
  postponed: number;
  created: number;
}

export interface WeeklyPoint {
  weekStart: string;
  label: string;
  completed: number;
  onTime: number;
  due: number;
  missed: number;
  postponed: number;
}

export interface MonthlyPoint {
  month: string;
  label: string;
  completed: number;
  created: number;
  postponed: number;
}

export interface CategoryMetric {
  category: string;
  total: number;
  completed: number;
  delayed: number;
  delayMinutes: number;
  estimatedLostMinutes: number;
  postponeEvents: number;
}

export interface CategoryImpact extends CategoryMetric {
  share: number;
}

export interface WeekdayMetric {
  weekday: string;
  completed: number;
  missed: number;
  postponed: number;
}

export interface AchievementDefinition {
  type: string;
  title: string;
  description: string;
  icon: string;
  tier: 'starter' | 'consistency' | 'recovery' | 'planning';
}

export interface Achievement extends AchievementDefinition {
  earned: boolean;
  earnedAt: string | null;
  progress: { current: number; target: number };
}

export interface AchievementState {
  achievements: Achievement[];
  earnedCount: number;
  totalCount: number;
}

export interface RealityCheck {
  id: string;
  tone: 'urgent' | 'warning' | 'info' | 'positive';
  title: string;
  body: string;
  taskId?: string;
}

export interface Recommendation {
  id: string;
  tone: 'urgent' | 'warning' | 'info' | 'positive';
  title: string;
  body: string;
  taskId?: string;
  action?: { label: string; href: string };
}

export interface ActivityItem {
  id: string;
  type: 'completed' | 'created' | 'postponed';
  title: string;
  taskId: string;
  at: string;
  detail?: string;
}

export interface Projection {
  available: boolean;
  reason?: string;
  projectedAdditionalDelayMinutes: number;
  eventsAnalyzed: number;
  windowDays: number;
  remainingDays: number;
  extensionMinutes: number;
  periodLabel: string;
  assumptions: string[];
}

export interface GoalImpact extends Goal {
  message: string;
}

export interface DelayHistoryItem {
  taskId: string;
  title: string;
  category: string;
  status: TaskStatus;
  postponeCount: number;
  originalDeadline: string | null;
  currentDeadline: string | null;
  completedAt: string | null;
  delayMinutes: number;
  estimatedLostMinutes: number;
  lastReason: string;
  records: PostponementView[];
}

export interface InsightsBundle {
  generatedAt: string;
  hasData: boolean;
  summary: Summary;
  timeLost: {
    totalDelayMinutes: number;
    estimatedLostMinutes: number;
    estimatedLostTaskCount: number;
    averageDelayMinutes: number;
    delayedTasks: number;
    postponeEvents: number;
    weekAddedMinutes: number;
    lateCompletionMinutes: number;
    currentOverdueMinutes: number;
    extensionMinutes: number;
  };
  onTime: {
    rate: number | null;
    onTimeCompleted: number;
    completedWithDeadline: number;
    completionRate: number;
  };
  projection: Projection;
  goalImpact: GoalImpact[];
  delayHistory: DelayHistoryItem[];
  categoryImpact: CategoryImpact[];
  opportunityCost: {
    items: string[];
    note: string;
  };
  realityChecks: RealityCheck[];
  comparison: {
    dueLast7: number;
    completedLast7: number;
    postponedLast7: number;
    overdueNow: number;
    createdLast7: number;
    completionRate: number;
    onTimeRate: number | null;
  };
  periodLabel: string;
  usedPostponements: string | null;
}

export interface ReflectionContext {
  date: string;
  completed: { id: string; title: string; completedAt: string | null }[];
  postponed: { id: string; taskId: string; title: string; reason: string; createdAt: string }[];
  openTasks: {
    id: string;
    title: string;
    priority: Priority;
    status: TaskStatus;
    deadline: string | null;
    estimatedDuration: number | null;
    postponeCount: number;
  }[];
  goals: Goal[];
  existing: Reflection | null;
  stats: {
    completedOnDate: number;
    open: number;
    overdue: number;
    postponeEvents: number;
  };
  suggestedTomorrowGoals: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  source: PlanSource | null;
  createdAt: string;
}

export interface AnalyticsBundle {
  daily: DailyPoint[];
  weekly: WeeklyPoint[];
  monthly: MonthlyPoint[];
  categories: CategoryMetric[];
  weekdays: WeekdayMetric[];
  last7Days: {
    extensionMinutes: number;
    lateCompletionMinutes: number;
    currentOverdueMinutes: number;
    weekAddedMinutes: number;
  };
  consistency: {
    activeDaysLast14: number;
    score: number;
  };
}

export interface DashboardBundle {
  todayPlan: Plan | null;
  upcoming: Task[];
  focusTasks: Task[];
  recommendations: Recommendation[];
  recentActivity: ActivityItem[];
  week: DailyPoint[];
}
