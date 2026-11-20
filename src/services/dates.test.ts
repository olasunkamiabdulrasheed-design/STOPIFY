import { describe, expect, it } from 'vitest';
import {
  addDays,
  clockToMinutes,
  dayKey,
  daysBetween,
  minutesBetween,
  minutesToClock,
  startOfWeek,
} from './dates';

describe('clock helpers', () => {
  it('converts between clock strings and minutes', () => {
    expect(clockToMinutes('09:30')).toBe(570);
    expect(minutesToClock(570)).toBe('09:30');
  });

  it('wraps times past midnight', () => {
    expect(minutesToClock(-30)).toBe('23:30');
    expect(minutesToClock(24 * 60 + 15)).toBe('00:15');
  });
});

describe('dayKey', () => {
  it('formats local dates as YYYY-MM-DD', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });
});

describe('minutesBetween', () => {
  it('returns zero when either side is missing', () => {
    expect(minutesBetween(null, '2026-01-01T00:00:00Z')).toBe(0);
    expect(minutesBetween('2026-01-01T00:00:00Z', null)).toBe(0);
  });

  it('returns signed whole minutes', () => {
    expect(minutesBetween('2026-01-01T01:30:00Z', '2026-01-01T00:00:00Z')).toBe(90);
    expect(minutesBetween('2026-01-01T00:00:00Z', '2026-01-01T01:30:00Z')).toBe(-90);
  });
});

describe('week math', () => {
  it('starts weeks on Monday', () => {
    const friday = new Date(2026, 0, 9, 12);
    expect(dayKey(startOfWeek(friday))).toBe('2026-01-05');
  });

  it('counts whole days between dates', () => {
    const first = new Date(2026, 0, 1, 12);
    expect(daysBetween(addDays(first, 10), first)).toBe(10);
  });
});
