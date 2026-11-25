export const DUE_SOON_KM = 1_000;
export const DUE_SOON_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReviewStatus = 'ok' | 'due_soon' | 'overdue';

export interface ReviewSchedule {
  intervalKm: number | null;
  intervalMonths: number | null;
  lastDoneKm: number;
  lastDoneAt: Date;
}

export interface ReviewEvaluation {
  status: ReviewStatus;
  dueKm: number | null;
  dueDate: Date | null;
  remainingKm: number | null;
  remainingDays: number | null;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDayOfTargetMonth));
  return result;
}

export function evaluateReview(
  schedule: ReviewSchedule,
  currentKm: number,
  now: Date,
): ReviewEvaluation {
  const dueKm = schedule.intervalKm === null ? null : schedule.lastDoneKm + schedule.intervalKm;
  const dueDate =
    schedule.intervalMonths === null
      ? null
      : addMonths(schedule.lastDoneAt, schedule.intervalMonths);
  const remainingKm = dueKm === null ? null : dueKm - currentKm;
  const remainingDays =
    dueDate === null ? null : Math.floor((dueDate.getTime() - now.getTime()) / DAY_MS);

  const isOverdue =
    (remainingKm !== null && remainingKm < 0) || (remainingDays !== null && remainingDays < 0);
  const isDueSoon =
    (remainingKm !== null && remainingKm <= DUE_SOON_KM) ||
    (remainingDays !== null && remainingDays <= DUE_SOON_DAYS);

  return {
    status: isOverdue ? 'overdue' : isDueSoon ? 'due_soon' : 'ok',
    dueKm,
    dueDate,
    remainingKm,
    remainingDays,
  };
}
