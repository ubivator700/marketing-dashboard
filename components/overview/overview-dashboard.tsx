"use client";

import { useMemo, useState } from "react";
import { useAppContext } from "@/lib/app-context";
import {
  monthlyStatsExtended,
  currentMonthKpi,
  groupByYearQuarter,
  type MonthStatExtended,
  type QuarterStat,
  type YearStat,
  type BreakdownItem,
} from "@/lib/overview-utils";
import StoreFilter from "@/components/ui/store-filter";
import ProductTypeFilter from "@/components/ui/product-type-filter";

// ─── Formatters ─────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("ru-RU");
}

function fmtShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}М`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}к`;
  return String(n);
}

// ─── Main component ─────────────────────────────────────────────

export default function OverviewDashboard() {
  const {
    channels,
    averageCheck,
    taxCoefficient,
    stores,
    selectedStoreId,
    setSelectedStoreId,
    productTypes,
    selectedProductTypeId,
    setSelectedProductTypeId,
    filteredLeads,
    filteredExpenses,
  } = useAppContext();

  const stats = useMemo(
    () => monthlyStatsExtended(filteredLeads, filteredExpenses, channels, averageCheck, 24, productTypes, taxCoefficient),
    [filteredLeads, filteredExpenses, channels, averageCheck, productTypes, taxCoefficient],
  );

  const kpi = useMemo(
    () => currentMonthKpi(filteredLeads, filteredExpenses, averageCheck, productTypes, taxCoefficient),
    [filteredLeads, filteredExpenses, averageCheck, productTypes, taxCoefficient],
  );

  const yearData = useMemo(() => groupByYearQuarter(stats), [stats]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Обзор</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Показатели за последние 24 месяца</p>
      </div>

      {/* Filters */}
      {(stores.length > 0 || productTypes.length > 0) && (
        <div className="space-y-2">
          {stores.length > 0 && (
            <StoreFilter stores={stores} selectedStoreId={selectedStoreId} onSelect={setSelectedStoreId} />
          )}
          {productTypes.length > 0 && (
            <ProductTypeFilter productTypes={productTypes} selectedProductTypeId={selectedProductTypeId} onSelect={setSelectedProductTypeId} />
          )}
        </div>
      )}

      {/* KPI cards — current month */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          Текущий месяц
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <KpiCard label="Лиды" value={String(kpi.leads)} icon="👥" color="indigo" />
          <KpiCard label="Результаты" value={`${kpi.measurements + kpi.sales}`} sub={`${kpi.measurements} замер · ${kpi.sales} продаж`} icon="🎯" color="violet" />
          <KpiCard label="Выручка" value={`${fmtShort(kpi.revenue)} \u20bd`} icon="💰" color="green" />
          <KpiCard label="Прибыль" value={`${fmtShort(kpi.profit)} \u20bd`} icon="📈" color="blue" />
          <KpiCard label="Расходы" value={`${fmtShort(kpi.expenses)} \u20bd`} icon="📉" color="red" />
          <KpiCard label="Итог" value={`${fmtShort(kpi.netResult)} \u20bd`} icon={kpi.netResult >= 0 ? "✅" : "⚠️"} color={kpi.netResult >= 0 ? "emerald" : "red"} />
          <KpiCard label="ROMI" value={kpi.romi !== null ? `${kpi.romi}%` : "—"} icon="📊" color="amber" />
        </div>
      </div>

      {/* Year → Quarter → Month hierarchy */}
      <div className="space-y-8">
        {yearData.map((year) => (
          <YearBlock key={year.year} year={year} />
        ))}
      </div>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; text: string; iconBg: string }> = {
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-900/30",  text: "text-indigo-700 dark:text-indigo-300",  iconBg: "bg-indigo-100 dark:bg-indigo-800" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-900/30",  text: "text-violet-700 dark:text-violet-300",  iconBg: "bg-violet-100 dark:bg-violet-800" },
  green:   { bg: "bg-green-50 dark:bg-green-900/30",   text: "text-green-700 dark:text-green-300",   iconBg: "bg-green-100 dark:bg-green-800" },
  blue:    { bg: "bg-blue-50 dark:bg-blue-900/30",    text: "text-blue-700 dark:text-blue-300",    iconBg: "bg-blue-100 dark:bg-blue-800" },
  red:     { bg: "bg-red-50 dark:bg-red-900/30",     text: "text-red-700 dark:text-red-300",     iconBg: "bg-red-100 dark:bg-red-800" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-900/30",   text: "text-amber-700 dark:text-amber-300",   iconBg: "bg-amber-100 dark:bg-amber-800" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", iconBg: "bg-emerald-100 dark:bg-emerald-800" },
};

function KpiCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  color: string;
}) {
  const c = COLOR_MAP[color] || COLOR_MAP.indigo;
  return (
    <div className={`${c.bg} rounded-2xl p-4 transition-shadow hover:shadow-md`}>
      <div className="flex items-center gap-2.5 mb-2">
        <span className={`${c.iconBg} w-8 h-8 rounded-lg flex items-center justify-center text-base`}>
          {icon}
        </span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className={`text-xl font-bold ${c.text}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Year Block ─────────────────────────────────────────────────

function YearBlock({ year }: { year: YearStat }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Year header — clickable to toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
      >
        {/* Chevron */}
        <svg
          className={`w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>

        <span className="text-xl font-bold text-gray-900 dark:text-white">{year.year}</span>

        {/* Year stats summary */}
        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
          <StatPill label="Лиды" value={String(year.leads)} bg="bg-indigo-50 dark:bg-indigo-900/30" color="text-indigo-700 dark:text-indigo-300" />
          <StatPill label="Рез." value={String(year.measurements + year.sales)} bg="bg-violet-50 dark:bg-violet-900/30" color="text-violet-700 dark:text-violet-300" />
          <StatPill label="Выручка" value={`${fmtShort(year.revenue)} \u20bd`} bg="bg-green-50 dark:bg-green-900/30" color="text-green-700 dark:text-green-300" />
          <StatPill label="Прибыль" value={`${fmtShort(year.profit)} \u20bd`} bg="bg-blue-50 dark:bg-blue-900/30" color="text-blue-700 dark:text-blue-300" />
          <StatPill label="Расходы" value={`${fmtShort(year.expenses)} \u20bd`} bg="bg-red-50 dark:bg-red-900/30" color="text-red-600 dark:text-red-300" />
          <StatPill
            label="Итог"
            value={`${fmtShort(year.netResult)} \u20bd`}
            bg={year.netResult >= 0 ? "bg-emerald-50 dark:bg-emerald-900/30" : "bg-red-50 dark:bg-red-900/30"}
            color={year.netResult >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}
          />
          {year.romi !== null && (
            <StatPill label="ROMI" value={`${year.romi}%`} bg="bg-amber-50 dark:bg-amber-900/30" color="text-amber-700 dark:text-amber-300" />
          )}
        </div>
      </button>

      {/* Collapsible content — quarters */}
      {open && (
        <div className="px-6 pb-5 space-y-4">
          {year.quarters.map((q) => (
            <QuarterBlock key={q.label} quarter={q} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, bg, color }: { label: string; value: string; bg: string; color: string }) {
  return (
    <span className={`hidden sm:inline-flex items-center gap-1.5 ${bg} rounded-lg px-2.5 py-1.5`}>
      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      <span className={`text-xs font-bold ${color}`}>{value}</span>
    </span>
  );
}

// ─── Quarter Block ──────────────────────────────────────────────

function QuarterBlock({ quarter }: { quarter: QuarterStat }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Quarter header — clickable to toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
      >
        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>

        <span className="text-base font-bold text-gray-800 dark:text-gray-100">{quarter.shortLabel}</span>

        {/* Quarter stats summary */}
        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
          <QStat label="Лиды" value={String(quarter.leads)} bg="bg-indigo-50 dark:bg-indigo-900/30" color="text-indigo-700 dark:text-indigo-300" />
          <QStat label="Рез." value={String(quarter.measurements + quarter.sales)} bg="bg-violet-50 dark:bg-violet-900/30" color="text-violet-700 dark:text-violet-300" />
          <QStat label="Выручка" value={`${fmtShort(quarter.revenue)} \u20bd`} bg="bg-green-50 dark:bg-green-900/30" color="text-green-700 dark:text-green-300" />
          <QStat label="Прибыль" value={`${fmtShort(quarter.profit)} \u20bd`} bg="bg-blue-50 dark:bg-blue-900/30" color="text-blue-700 dark:text-blue-300" />
          <QStat label="Расходы" value={`${fmtShort(quarter.expenses)} \u20bd`} bg="bg-red-50 dark:bg-red-900/30" color="text-red-600 dark:text-red-300" />
          <QStat
            label="Итог"
            value={`${fmtShort(quarter.netResult)} \u20bd`}
            bg={quarter.netResult >= 0 ? "bg-emerald-50 dark:bg-emerald-900/30" : "bg-red-50 dark:bg-red-900/30"}
            color={quarter.netResult >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}
          />
          {quarter.romi !== null && (
            <QStat label="ROMI" value={`${quarter.romi}%`} bg="bg-amber-50 dark:bg-amber-900/30" color="text-amber-700 dark:text-amber-300" />
          )}
        </div>
      </button>

      {/* Collapsible content — month cards */}
      {open && (
        <div className="px-5 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {quarter.months.map((month) => (
              <MonthCard key={`${month.year}-${month.month}`} month={month} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QStat({ label, value, bg, color }: { label: string; value: string; bg: string; color: string }) {
  return (
    <span className={`hidden sm:inline-flex items-center gap-1 ${bg} rounded-md px-2 py-1`}>
      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{label}</span>
      <span className={`text-[11px] font-bold ${color}`}>{value}</span>
    </span>
  );
}

// ─── Month Card ─────────────────────────────────────────────────

function MonthCard({ month }: { month: MonthStatExtended }) {
  const maxChannelLeads = Math.max(...month.channelBreakdown.map((c) => c.leads), 1);
  const maxProductLeads = Math.max(...month.productBreakdown.map((p) => p.leads), 1);
  const isPositiveResult = month.netResult >= 0;

  return (
    <div className="bg-gray-50/80 dark:bg-gray-750/50 rounded-xl border border-gray-100 dark:border-gray-600 p-4 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">{month.fullLabel}</h4>
        {month.prevMonthChangeLeads !== null && (
          <ChangeBadge value={month.prevMonthChangeLeads} />
        )}
      </div>

      {/* Main metrics — 2-column layout */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-4">
        <Metric label="Лиды" value={String(month.leads)} color="text-indigo-600" />
        <Metric
          label="Результаты"
          value={String(month.measurements + month.sales)}
          sub={`${month.measurements} зам. · ${month.sales} прод.`}
          color="text-violet-600"
        />
        <Metric label="Выручка" value={`${fmtShort(month.revenue)} \u20bd`} color="text-green-600" />
        <Metric label="Прибыль" value={`${fmtShort(month.profit)} \u20bd`} color="text-blue-600" />
        <Metric label="Расходы" value={`${fmtShort(month.expenses)} \u20bd`} color="text-red-500" />
        <Metric
          label="ROMI"
          value={month.romi !== null ? `${month.romi}%` : "\u2014"}
          color={month.romi !== null && month.romi >= 0 ? "text-amber-600" : "text-red-500"}
        />
      </div>

      {/* Net result bar */}
      <div className="mb-4 rounded-lg bg-white dark:bg-gray-800 p-3 border border-gray-100 dark:border-gray-600">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Итог</span>
          <span className={`text-sm font-bold ${isPositiveResult ? "text-emerald-600" : "text-red-600"}`}>
            {isPositiveResult ? "+" : ""}{fmt(month.netResult)} {"\u20bd"}
          </span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          {month.revenue > 0 && (
            <div
              className={`h-full rounded-full transition-all ${isPositiveResult ? "bg-emerald-400" : "bg-red-400"}`}
              style={{
                width: `${Math.min(100, Math.abs(month.netResult) > 0 ? (Math.abs(month.netResult) / Math.max(month.revenue, month.expenses)) * 100 : 0)}%`,
              }}
            />
          )}
        </div>
      </div>

      {/* Breakdowns side-by-side */}
      <div className="grid grid-cols-2 gap-3">
        {/* Channel breakdown */}
        <BreakdownSection
          title="Каналы"
          items={month.channelBreakdown}
          maxLeads={maxChannelLeads}
        />
        {/* Product breakdown */}
        <BreakdownSection
          title="Товары"
          items={month.productBreakdown}
          maxLeads={maxProductLeads}
        />
      </div>

      {/* No data message */}
      {month.channelBreakdown.length === 0 && month.productBreakdown.length === 0 && month.leads === 0 && (
        <p className="text-xs text-gray-300 dark:text-gray-600 text-center py-2 mt-2">Нет данных</p>
      )}
    </div>
  );
}

// ─── Metric ─────────────────────────────────────────────────────

function Metric({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">{label}</p>
      <p className={`text-sm font-bold ${color} leading-tight`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{sub}</p>}
    </div>
  );
}

// ─── Breakdown Section ──────────────────────────────────────────

function BreakdownSection({
  title,
  items,
  maxLeads,
}: {
  title: string;
  items: BreakdownItem[];
  maxLeads: number;
}) {
  if (items.length === 0) {
    return (
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-300 dark:text-gray-600 font-semibold mb-1.5">{title}</p>
        <p className="text-[10px] text-gray-300 dark:text-gray-600">—</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-1.5">{title}</p>
      <div className="space-y-1">
        {items
          .sort((a, b) => b.leads - a.leads)
          .slice(0, 5)
          .map((item) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 dark:text-gray-400 w-14 truncate flex-shrink-0" title={item.name}>
                {item.name}
              </span>
              <div className="flex-1 h-1.5 bg-gray-200/60 dark:bg-gray-600/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(item.leads / maxLeads) * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 w-4 text-right flex-shrink-0">
                {item.leads}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── Change Badge ───────────────────────────────────────────────

function ChangeBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
        isPositive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
      }`}
      title={`${isPositive ? "+" : ""}${value}% лиды vs пред. месяц`}
    >
      {isPositive ? "\u2191" : "\u2193"} {Math.abs(value)}%
    </span>
  );
}
