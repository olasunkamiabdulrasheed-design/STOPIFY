import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  Brain,
  CalendarCheck,
  CheckCircle2,
  CheckSquare,
  Flame,
  Gauge,
  NotebookPen,
  Rocket,
  Shield,
  Sparkles,
  Target,
  TimerOff,
  Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  'check-circle': CheckCircle2,
  flame: Flame,
  trophy: Trophy,
  shield: Shield,
  'calendar-check': CalendarCheck,
  target: Target,
  brain: Brain,
  notebook: NotebookPen,
  rocket: Rocket,
};

export function AchievementIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = icons[name] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}
