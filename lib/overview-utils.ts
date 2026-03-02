import type { Lead, Expense, Channel } from "@/types/dashboard";

// ─── Types ───────────────────────────────────────────────────────

export interface MonthStat {
  label: string;       // "Янв", "Фев", ...
  year: number;
  month: number;       // 0-based
  leads: number;
  profitableLeads: number;
  measurements: number;
  sales: number;
  expenses: number;
}

export interface ChannelPieItem {
  name: string;
  value: number;
  color: string;
}

export interface BreakdownItem {
  id: number;
  name: string;
  leads: number;
  color: string;
}

// ─── Month names ─────────────────────────────────────────────────

const MONTH_SHORT = [
  "Янв", "Фев", "Мар", "Апр", "Май", "Июн",
  "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек",
];

const MONTH_FULL = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

// ─── Colors ──────────────────────────────────────────────────────

export const CHANNEL_COLORS = [
  "#6366f1", "#ec4899", "#10b981", "#f59e0b", "#3b82f6",
  "#ef4444", "#8b5cf6", "#14b8a6", "#f97316",
];

export const PRODUCT_COLORS = [
  "#8b5cf6", "#06b6d4", "#f97316", "#84cc16", "#e11d48",
  "#0ea5e9", "#d946ef", "#14b8a6", "#eab308",
];

// ─── Helpers ─────────────────────────────────────────────────────

export function isProfitable(lead: Lead): boolean {
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
    const measurements = mLeads.filter((l) => l.result === "measurement").length;
    const sales = mLeads.filter((l) => l.result === "sale").length;
    const totalExp = mExpenses.reduce((s, e) => s + e.amount, 0);

    result.push({
      label: MONTH_SHORT[month],
      year,
      month,
      leads: mLeads.length,
      profitableLeads: profitableCount,
      measurements,
      sales,
      expenses: totalExp,
    });
  }

  return result;
}

// ─── Extended monthly stats with channel + product breakdown ────

export interface MonthStatExtended extends MonthStat {
  fullLabel: string; // "Январь 2026"
  channelBreakdown: BreakdownItem[];
  productBreakdown: BreakdownItem[];
  prevMonthChangeLeads: number | null; // % change vs previous month
}

export function monthlyStatsExtended(
  leads: Lead[],
  expenses: Expense[],
  channels: Channel[],
  monthCount: number = 12,
  productTypes?: { id: number; name: string }[],
): MonthStatExtended[] {
  const stats = monthlyStats(leads, expenses, monthCount);
  const result: MonthStatExtended[] = [];

  for (let i = 0; i < stats.length; i++) {
    const s = stats[i];
    const mLeads = leadsForMonth(leads, s.year, s.month);

    const channelBreakdown: BreakdownItem[] = channels.map((ch, ci) => {
      const chLeads = mLeads.filter((l) => l.channelId === ch.id);
      return {
        id: ch.id,
        name: ch.name,
        leads: chLeads.length,
        color: CHANNEL_COLORS[ci % CHANNEL_COLORS.length],
      };
    }).filter((c) => c.leads > 0);

    // Product breakdown: count leads by product type (a lead with multiple types counts for each)
    const productBreakdown: BreakdownItem[] = (productTypes || []).map((pt, pi) => {
      const ptLeads = mLeads.filter((l) => l.productTypeIds.includes(pt.id));
      return {
        id: pt.id,
        name: pt.name,
        leads: ptLeads.length,
        color: PRODUCT_COLORS[pi % PRODUCT_COLORS.length],
      };
    }).filter((p) => p.leads > 0);

    const prev = i > 0 ? stats[i - 1] : null;
    const prevMonthChangeLeads = prev && prev.leads > 0
      ? Math.round(((s.leads - prev.leads) / prev.leads) * 100)
      : null;

    result.push({
      ...s,
      fullLabel: `${MONTH_FULL[s.month]} ${s.year}`,
      channelBreakdown,
      productBreakdown,
      prevMonthChangeLeads,
    });
  }

  return result;
}

// ─── Quarter / Year aggregation ─────────────────────────────────

export interface QuarterStat {
  label: string;       // "Q1 2026"
  shortLabel: string;  // "1 квартал"
  year: number;
  quarter: number;     // 1-4
  months: MonthStatExtended[];
  leads: number;
  profitableLeads: number;
  measurements: number;
  sales: number;
  expenses: number;
}

export interface YearStat {
  year: number;
  quarters: QuarterStat[];
  leads: number;
  profitableLeads: number;
  measurements: number;
  sales: number;
  expenses: number;
}

const QUARTER_LABELS = ["1 квартал", "2 квартал", "3 квартал", "4 квартал"];

function aggregateStats(months: MonthStatExtended[]): {
  leads: number;
  profitableLeads: number;
  measurements: number;
  sales: number;
  expenses: number;
} {
  const leads = months.reduce((s, m) => s + m.leads, 0);
  const profitableLeads = months.reduce((s, m) => s + m.profitableLeads, 0);
  const measurements = months.reduce((s, m) => s + m.measurements, 0);
  const sales = months.reduce((s, m) => s + m.sales, 0);
  const expenses = months.reduce((s, m) => s + m.expenses, 0);
  return { leads, profitableLeads, measurements, sales, expenses };
}

/** Group extended monthly stats into Year → Quarter → Month hierarchy.
 *  Returns years in descending order (newest first).
 *  Quarters within a year are in descending order (Q4 first).
 *  Months within a quarter are in descending order (latest first). */
export function groupByYearQuarter(monthStats: MonthStatExtended[]): YearStat[] {
  // Group by year
  const yearMap = new Map<number, MonthStatExtended[]>();
  for (const m of monthStats) {
    if (!yearMap.has(m.year)) yearMap.set(m.year, []);
    yearMap.get(m.year)!.push(m);
  }

  const years: YearStat[] = [];

  for (const [year, months] of yearMap) {
    // Group by quarter
    const quarterMap = new Map<number, MonthStatExtended[]>();
    for (const m of months) {
      const q = Math.floor(m.month / 3) + 1; // 1-4
      if (!quarterMap.has(q)) quarterMap.set(q, []);
      quarterMap.get(q)!.push(m);
    }

    const quarters: QuarterStat[] = [];
    for (const [q, qMonths] of quarterMap) {
      // Sort months ascending (earliest first, left to right)
      qMonths.sort((a, b) => a.month - b.month);
      const agg = aggregateStats(qMonths);
      quarters.push({
        label: `Q${q} ${year}`,
        shortLabel: QUARTER_LABELS[q - 1],
        year,
        quarter: q,
        months: qMonths,
        ...agg,
      });
    }

    // Sort quarters descending
    quarters.sort((a, b) => b.quarter - a.quarter);

    const yearAgg = aggregateStats(months);
    years.push({
      year,
      quarters,
      ...yearAgg,
    });
  }

  // Sort years descending
  years.sort((a, b) => b.year - a.year);

  return years;
}

// ─── Current month KPIs ─────────────────────────────────────────

export function currentMonthKpi(
  leads: Lead[],
  expenses: Expense[],
) {
  const now = new Date();
  const mLeads = leadsForMonth(leads, now.getFullYear(), now.getMonth());
  const mExpenses = expensesForMonth(expenses, now.getFullYear(), now.getMonth());
  const measurements = mLeads.filter((l) => l.result === "measurement").length;
  const sales = mLeads.filter((l) => l.result === "sale").length;
  const totalExp = mExpenses.reduce((s, e) => s + e.amount, 0);

  return {
    leads: mLeads.length,
    measurements,
    sales,
    expenses: totalExp,
  };
}
