"use client";

import { useState, useMemo } from "react";
import type { Lead, Expense } from "@/types/dashboard";
import { dayNamesShortRu } from "@/lib/data";
import { leadsByDate, leadsForMonth } from "@/lib/lead-utils";

interface LeadsCalendarProps {
  leads: Lead[];
  expenses: Expense[];
  dailyLeadPlan: number;
  monthlyLeadPlan: number;
  onSelectDay: (date: string, dayLeads: Lead[]) => void;
}

// ─── Calendar helpers ─────────────────────────────────────────────

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7; // Mon = 0
  const days: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function LeadsCalendar({
  leads,
  expenses,
  dailyLeadPlan,
  monthlyLeadPlan,
  onSelectDay,
}: LeadsCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month]);
  const monthLeads = useMemo(() => leadsForMonth(leads, year, month), [leads, year, month]);

  // Build map: dateKey → lead count
  const leadCountMap = useMemo(() => {
    const map = new Map<string, number>();
    monthLeads.forEach((l) => {
      map.set(l.date, (map.get(l.date) ?? 0) + 1);
    });
    return map;
  }, [monthLeads]);

  // Build map: dateKey → daily expense total (from expenses that have a date-like name or just spread monthly)
  // Since expenses don't have dates, we spread total monthly channel expenses evenly across days
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Total channel expenses (those that have a channelId)
  const totalChannelExpenses = useMemo(
    () => expenses.filter((e) => e.channelId !== null).reduce((s, e) => s + e.amount, 0),
    [expenses]
  );
  const dailyExpenseAvg = daysInMonth > 0 ? Math.round(totalChannelExpenses / daysInMonth) : 0;

  // Monthly completion
  const monthlyCompletion = monthlyLeadPlan > 0 ? Math.round((monthLeads.length / monthlyLeadPlan) * 100) : 0;

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const monthLabel = new Date(year, month).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  const todayKey = formatDateKey(today);

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
          >
            ◂
          </button>
          <h3 className="text-base font-semibold text-gray-900 capitalize min-w-[140px] sm:min-w-[180px] text-center">
            {monthLabel}
          </h3>
          <button
            onClick={nextMonth}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
          >
            ▸
          </button>
        </div>
        <button
          onClick={goToday}
          className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
        >
          Сегодня
        </button>
      </div>

      {/* Monthly summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Лидов за месяц</p>
          <p className="text-lg font-bold text-gray-900">{monthLeads.length}<span className="text-sm font-normal text-gray-400">/{monthlyLeadPlan}</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Выполнение</p>
          <p className={`text-lg font-bold ${monthlyCompletion >= 100 ? "text-green-600" : monthlyCompletion >= 50 ? "text-yellow-600" : "text-red-500"}`}>{monthlyCompletion}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">План/день</p>
          <p className="text-lg font-bold text-indigo-600">{dailyLeadPlan}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Расходы/день (ср.)</p>
          <p className="text-lg font-bold text-red-500">{dailyExpenseAvg.toLocaleString("ru-RU")} ₽</p>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <div className="min-w-[500px]">
        {/* Day names header */}
        <div className="grid grid-cols-7 bg-gray-50/80 border-b border-gray-100">
          {dayNamesShortRu.map((name) => (
            <div key={name} className="px-2 py-2 text-xs font-medium text-gray-500 text-center">
              {name}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            if (!day) {
              return <div key={`empty-${i}`} className="h-28 border-b border-r border-gray-50" />;
            }

            const dateKey = formatDateKey(day);
            const count = leadCountMap.get(dateKey) ?? 0;
            const isToday = dateKey === todayKey;
            const dailyPct = dailyLeadPlan > 0 ? Math.round((count / dailyLeadPlan) * 100) : 0;

            // Color coding
            let bgColor = "bg-white";
            let ringClass = "";
            if (count > 0) {
              if (count >= dailyLeadPlan) bgColor = "bg-green-50";
              else bgColor = "bg-amber-50";
            }
            if (isToday) ringClass = "ring-2 ring-indigo-400 ring-inset";

            // Progress bar color
            let barColor = "bg-gray-300"; // 0 leads — red/neutral
            if (count > 0 && count < dailyLeadPlan) barColor = "bg-amber-400";
            if (count >= dailyLeadPlan && dailyLeadPlan > 0) barColor = "bg-green-500";

            return (
              <button
                key={dateKey}
                onClick={() => onSelectDay(dateKey, leadsByDate(leads, dateKey))}
                className={`h-28 border-b border-r border-gray-50 p-1.5 text-left hover:bg-gray-50/70 transition-colors ${bgColor} ${ringClass}`}
              >
                {/* Row 1: day number + percentage badge */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-semibold ${
                      isToday
                        ? "bg-indigo-600 text-white w-5 h-5 rounded-full flex items-center justify-center"
                        : "text-gray-600"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {count > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      dailyPct >= 100 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {dailyPct}%
                    </span>
                  )}
                </div>

                {/* Row 2: large actual count / plan */}
                <div className="flex items-baseline gap-0.5 mb-1.5">
                  <span className={`text-lg font-black leading-none ${
                    count >= dailyLeadPlan && dailyLeadPlan > 0
                      ? "text-green-700"
                      : count > 0
                        ? "text-amber-700"
                        : "text-gray-300"
                  }`}>
                    {count}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">/{dailyLeadPlan}</span>
                </div>

                {/* Row 3: visible progress bar */}
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(100, dailyPct)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-50 border border-green-200" />
          <span>Факт ≥ план</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-amber-50 border border-amber-200" />
          <span>Частично</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-white border border-gray-200" />
          <span>Нет лидов</span>
        </div>
      </div>
    </div>
  );
}
