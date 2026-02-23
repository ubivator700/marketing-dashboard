import type { Lead, Expense, Channel } from "@/types/dashboard";

// ─── Types ───────────────────────────────────────────────────────

export interface MonthStat {
  label: string;       // "Янв", "Фев", ...
  year: number;
  month: number;       // 0-based
  leads: number;
  profitableLeads: number;
  revenue: number;
  expenses: number;
  romi: number | null;
}

export interface ChannelPieItem {
  name: string;
  value: number;
  color: string;
}

// ─── Month names ─────────────────────────────────────────────────

const MONTH_SHORT = [
  "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
  "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек",
];

// ─── Colors for channels ────────────────────────────────────────

const CHANNEL_COLORS = [
  "#6366f1", "#ec4899", "#10b981", "#f59e0b", "#3b82f6",
  "#ef4444", "#8b5cf6", "#14b8a6", "#f97316",
];

// ─── Helpers ─────────────────────────────────────────────────────

function isProfitable(lead: Lead): boolean {
  return lead.result === "measurement" || lead.result === "sale";
}

function leadsForMonth(leads: Lead[], year: number, month: number): Lead[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return leads.filter((l) => l.date.startsWith(prefix));
}

function expensesForMonth(expenses: Expense[], year: number, month: number): Expense[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return expenses.filter((e) => e.date.startsWith(prefix));
}

// ─── Monthly stats ──────────────────────────────────────────────

export function monthlyStats(
  leads: Lead[],
  expenses: Expense[],
  avgCheck: number,
  monthCount: number = 12,
): MonthStat[] {
  const now = new Date();
  const result: MonthStat[] = [];

  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();

    const mLeads = leadsForMonth(leads, year, month);
    const mExpenses = expensesForMonth(expenses, year, month);
    const profitableCount = mLeads.filter(isProfitable).length;
    const revenue = profitableCount * avgCheck;
    const totalExp = mExpenses.reduce((s, e) => s + e.amount, 0);
    const romi = totalExp > 0 ? Math.round(((revenue - totalExp) / totalExp) * 100) : null;

    result.push({
      label: MONTH_SHORT[month],
      year,
      month,
      leads: mLeads.length,
      profitableLeads: profitableCount,
      revenue,
      expenses: totalExp,
      romi,
    });
  }

  return result;
}

// ─── Channel pie data ───────────────────────────────────────────

export function channelPieData(
  leads: Lead[],
  expenses: Expense[],
  channels: Channel[],
  avgCheck: number,
): ChannelPieItem[] {
  return channels
    .map((ch, i) => {
      const chLeads = leads.filter((l) => l.channelId === ch.id);
      const profitable = chLeads.filter(isProfitable).length;
      return {
        name: ch.name,
        value: profitable * avgCheck,
        color: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
      };
    })
    .filter((item) => item.value > 0);
}

// ─── Current month KPIs ─────────────────────────────────────────

export function currentMonthKpi(
  leads: Lead[],
  expenses: Expense[],
  avgCheck: number,
) {
  const now = new Date();
  const mLeads = leadsForMonth(leads, now.getFullYear(), now.getMonth());
  const mExpenses = expensesForMonth(expenses, now.getFullYear(), now.getMonth());
  const profitable = mLeads.filter(isProfitable).length;
  const revenue = profitable * avgCheck;
  const totalExp = mExpenses.reduce((s, e) => s + e.amount, 0);
  const romi = totalExp > 0 ? Math.round(((revenue - totalExp) / totalExp) * 100) : null;

  return {
    leads: mLeads.length,
    revenue,
    expenses: totalExp,
    romi,
  };
}
