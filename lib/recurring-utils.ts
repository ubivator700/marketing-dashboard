import type { RecurringTask } from "@/types/dashboard";

/**
 * CalendarItem-like shape generated from a recurring task.
 * The `id` is virtual: "r-<recurringTaskId>-<YYYY-MM-DD>"
 */
export interface RecurringCalendarItem {
  id: string;
  name: string;
  description: string;
  assignee: string;
  deadline: string;       // "YYYY-MM-DD"
  dueTime?: string;       // "HH:MM"
  duration?: number;      // minutes
  status: string;
  statusLabel: string;
  statusColor: string;
  source: "recurring";
  color: string;
  recurringTaskId: number;
}

const RECURRING_COLOR = "#f59e0b"; // amber-500

/**
 * Generate virtual calendar instances for a recurring task within a date range.
 *
 * @param task — the recurring task definition
 * @param startDate — range start (inclusive), "YYYY-MM-DD"
 * @param endDate — range end (inclusive), "YYYY-MM-DD"
 * @param employeeColorMap — map of employee name → color
 * @returns array of RecurringCalendarItem
 */
export function generateInstances(
  task: RecurringTask,
  startDate: string,
  endDate: string,
  employeeColorMap?: Map<string, string>,
): RecurringCalendarItem[] {
  if (task.status === "paused") return [];

  const items: RecurringCalendarItem[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  const color = employeeColorMap?.get(task.assignee) ?? RECURRING_COLOR;

  const current = new Date(start);

  while (current <= end) {
    if (isOccurrence(task, current)) {
      const dateKey = formatDateKey(current);
      items.push({
        id: `r-${task.id}-${dateKey}`,
        name: task.name,
        description: task.description,
        assignee: task.assignee,
        deadline: dateKey,
        dueTime: task.dueTime,
        duration: task.duration,
        status: "recurring",
        statusLabel: "Регулярная",
        statusColor: "bg-amber-100 text-amber-700",
        source: "recurring",
        color,
        recurringTaskId: task.id,
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return items;
}

/**
 * Check if a given date is a valid occurrence for the recurring task.
 */
function isOccurrence(task: RecurringTask, date: Date): boolean {
  switch (task.recurrenceType) {
    case "daily":
      return isDailyOccurrence(task, date);
    case "weekly":
      return isWeeklyOccurrence(task, date);
    case "monthly":
      return isMonthlyOccurrence(task, date);
    default:
      return false;
  }
}

/**
 * Daily: every N days from an epoch.
 * We use a simple modulo from a reference date (2026-01-01).
 */
function isDailyOccurrence(task: RecurringTask, date: Date): boolean {
  const interval = task.recurrenceInterval || 1;
  if (interval === 1) return true;

  const ref = new Date("2026-01-01T00:00:00");
  const diffDays = Math.floor((date.getTime() - ref.getTime()) / 86400000);
  return diffDays >= 0 && diffDays % interval === 0;
}

/**
 * Weekly: on specific days of the week, every N weeks.
 * recurrenceDays = "0,2,4" means Mon(0), Wed(2), Fri(4)
 * Week numbering: week 0 starts from 2026-01-05 (Monday).
 */
function isWeeklyOccurrence(task: RecurringTask, date: Date): boolean {
  const interval = task.recurrenceInterval || 1;
  const daysStr = task.recurrenceDays || "";
  if (!daysStr) return false;

  const allowedDays = daysStr.split(",").map(Number); // 0=Mon, 1=Tue, ..., 6=Sun
  const dow = date.getDay(); // JS: 0=Sun, 1=Mon, ..., 6=Sat
  const adjustedDow = dow === 0 ? 6 : dow - 1; // Convert to Mon=0 ... Sun=6

  if (!allowedDays.includes(adjustedDow)) return false;

  if (interval === 1) return true;

  // Check week number from reference Monday (2026-01-05)
  const ref = new Date("2026-01-05T00:00:00"); // Monday
  const diffDays = Math.floor((date.getTime() - ref.getTime()) / 86400000);
  const weekNum = Math.floor(diffDays / 7);
  return weekNum >= 0 && weekNum % interval === 0;
}

/**
 * Monthly: on specific day(s) of month, every N months.
 * recurrenceDays = "15" means 15th of every Nth month.
 * recurrenceDays = "1,15" means 1st and 15th.
 */
function isMonthlyOccurrence(task: RecurringTask, date: Date): boolean {
  const interval = task.recurrenceInterval || 1;
  const daysStr = task.recurrenceDays || "";
  if (!daysStr) return false;

  const allowedDays = daysStr.split(",").map(Number);
  const dayOfMonth = date.getDate();

  if (!allowedDays.includes(dayOfMonth)) return false;

  if (interval === 1) return true;

  // Check month number from reference (January 2026 = month 0)
  const refYear = 2026;
  const refMonth = 0; // January
  const monthDiff = (date.getFullYear() - refYear) * 12 + (date.getMonth() - refMonth);
  return monthDiff >= 0 && monthDiff % interval === 0;
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
