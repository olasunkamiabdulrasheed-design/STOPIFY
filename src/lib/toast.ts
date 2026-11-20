import { toast } from 'sonner';
import type { AchievementDefinition } from './types';

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}

export function toastError(error: unknown): void {
  toast.error(errorMessage(error));
}

export function notifyAchievements(achievements: AchievementDefinition[] | undefined): void {
  if (!achievements || achievements.length === 0) return;
  for (const achievement of achievements) {
    toast.success(`Achievement unlocked — ${achievement.title}`, {
      id: `achievement-${achievement.type}`,
      description: achievement.description,
    });
  }
}
