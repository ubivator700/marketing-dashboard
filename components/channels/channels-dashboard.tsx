"use client";

import { useState, useCallback, useMemo } from "react";
import type { Channel, ChannelGroup, StandaloneTask } from "@/types/dashboard";
import { useAppContext } from "@/lib/app-context";
import {
  addChannel,
  updateChannel,
  deleteChannel as removeChannel,
} from "@/lib/channel-utils";
import { leadsByDate, leadsForMonth } from "@/lib/lead-utils";
import { totalExpensesForChannel } from "@/lib/expense-utils";
import ChannelCardList from "./channel-card-list";
import ChannelDetailModal from "./channel-detail-modal";
import ChannelEditModal from "./channel-edit-modal";
import StoreFilter from "@/components/ui/store-filter";
import ProductTypeFilter from "@/components/ui/product-type-filter";

export default function ChannelsDashboard() {
  const {
    channels, setChannels,
    leads,
    expenses, setExpenses,
    averageCheck, setAverageCheck,
    monthlyLeadPlan, setMonthlyLeadPlan,
    dailyLeadPlan,
    standaloneTasks, setStandaloneTasks,
    employees,
    stores, selectedStoreId, setSelectedStoreId,
    productTypes, selectedProductTypeId, setSelectedProductTypeId,
    filteredLeads, filteredExpenses,
  } = useAppContext();

  const [filterGroup, setFilterGroup] = useState<ChannelGroup | null>(null);

  // Modal states
  const [detailChannel, setDetailChannel] = useState<Channel | null>(null);
  const [editChannel, setEditChannel] = useState<{ channel: Channel | null } | null>(null);

  // Inline edits
  const [editingCheck, setEditingCheck] = useState(false);
  const [checkInput, setCheckInput] = useState(String(averageCheck));
  const [editingMonthly, setEditingMonthly] = useState(false);
  const [monthlyInput, setMonthlyInput] = useState(String(monthlyLeadPlan));

  // ─── Month picker state ───
  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-based

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedYear((y) => y - 1); setSelectedMonth(11); }
    else setSelectedMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedYear((y) => y + 1); setSelectedMonth(0); }
    else setSelectedMonth((m) => m + 1);
  };
  const goCurrentMonth = () => {
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  const monthLabel = new Date(selectedYear, selectedMonth).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  // ─── Date keys ───
  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const monthPrefix = useMemo(
    () => `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`,
    [selectedYear, selectedMonth]
  );

  // ─── Month-filtered data (all financial metrics use current month only) ───
  const monthFilteredLeads = useMemo(
    () => filteredLeads.filter((l) => l.date.startsWith(monthPrefix)),
    [filteredLeads, monthPrefix]
  );
  const monthFilteredExpenses = useMemo(
    () => filteredExpenses.filter((e) => e.date.startsWith(monthPrefix)),
    [filteredExpenses, monthPrefix]
  );

  // ─── Expenses (current month) ───
  const channelExpensesTotal = useMemo(() => {
    return channels.reduce((sum, c) => sum + totalExpensesForChannel(monthFilteredExpenses, c.id), 0);
  }, [channels, monthFilteredExpenses]);

  // ─── Daily/monthly leads (for plan blocks) ───
  const todayLeads = useMemo(() => leadsByDate(filteredLeads, todayKey), [filteredLeads, todayKey]);
  const monthLeads = useMemo(() => leadsForMonth(filteredLeads, selectedYear, selectedMonth), [filteredLeads, selectedYear, selectedMonth]);

  // ─── Channel CRUD ───
  const handleChannelSave = useCallback(
    (channel: Channel) => {
      setChannels((prev) => {
        const exists = prev.some((c) => c.id === channel.id);
        if (exists) return updateChannel(prev, channel.id, channel);
        return addChannel(prev, channel);
      });
      setEditChannel(null);
      setDetailChannel(null);
    },
    [setChannels]
  );

  const handleChannelDelete = useCallback(
    (channelId: number) => {
      setChannels((prev) => removeChannel(prev, channelId));
      setExpenses((prev) =>
        prev.map((e) => (e.channelId === channelId ? { ...e, channelId: null } : e))
      );
      setEditChannel(null);
      setDetailChannel(null);
    },
    [setChannels, setExpenses]
  );

  // ─── Standalone tasks linked to channels ───
  const teamMembers = useMemo(() => employees.map((e) => e.name), [employees]);

  const handleToggleTask = useCallback(
    (_channelId: number, taskId: number) => {
      setStandaloneTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: t.status === "done" ? "todo" : "done" } : t
        )
      );
    },
    [setStandaloneTasks]
  );
  const handleAddTask = useCallback(
    (_channelId: number, task: StandaloneTask) => {
      setStandaloneTasks((prev) => [...prev, task]);
    },
    [setStandaloneTasks]
  );
  const handleDeleteTask = useCallback(
    (_channelId: number, taskId: number) => {
      setStandaloneTasks((prev) => prev.filter((t) => t.id !== taskId));
    },
    [setStandaloneTasks]
  );

  // Inline save helpers
  const saveCheck = () => {
    const val = Number(checkInput);
    if (val > 0) setAverageCheck(val);
    setEditingCheck(false);
  };
  const saveMonthly = () => {
    const val = Number(monthlyInput);
    if (val > 0) setMonthlyLeadPlan(val);
    setEditingMonthly(false);
  };
  const groupFilters: { id: ChannelGroup | null; label: string }[] = [
    { id: null, label: "Все" },
    { id: "digital", label: "Цифровой" },
    { id: "offline", label: "Оффлайн" },
    { id: "loyalty", label: "Лояльность" },
  ];

  // ─── Group-level stats (Digital, Offline, Loyalty) ───
  const groupStats = useMemo(() => {
    const groups: { id: ChannelGroup; label: string }[] = [
      { id: "digital", label: "Цифровой маркетинг" },
      { id: "offline", label: "Оффлайн маркетинг" },
      { id: "loyalty", label: "Лояльность" },
    ];
    return groups.map((g) => {
      const groupChannels = channels.filter((c) => c.group === g.id);
      const groupChannelIds = groupChannels.map((c) => c.id);
      const groupExpenses = groupChannels.reduce(
        (sum, c) => sum + totalExpensesForChannel(monthFilteredExpenses, c.id),
        0
      );
      const groupLeads = monthFilteredLeads.filter((l) => groupChannelIds.includes(l.channelId));
      const leadCount = groupLeads.length;
      const resultCount = groupLeads.filter((l) => l.result === "measurement" || l.result === "sale").length;
      const costPerLead = leadCount > 0 ? Math.round(groupExpenses / leadCount) : null;
      const costPerResult = resultCount > 0 ? Math.round(groupExpenses / resultCount) : null;
      return {
        id: g.id,
        label: g.label,
        channelCount: groupChannels.length,
        leadCount,
        expenses: groupExpenses,
        costPerLead,
        costPerResult,
      };
    });
  }, [channels, monthFilteredLeads, monthFilteredExpenses]);

  const dailyPct = dailyLeadPlan > 0 ? Math.min(100, Math.round((todayLeads.length / dailyLeadPlan) * 100)) : 0;
  const monthlyPct = monthlyLeadPlan > 0 ? Math.min(100, Math.round((monthLeads.length / monthlyLeadPlan) * 100)) : 0;
  const overallCostPerLead = monthFilteredLeads.length > 0 ? Math.round(channelExpensesTotal / monthFilteredLeads.length) : null;
  const overallResults = monthFilteredLeads.filter((l) => l.result === "measurement" || l.result === "sale").length;
  const overallCostPerResult = overallResults > 0 ? Math.round(channelExpensesTotal / overallResults) : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Рекламные каналы</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {channels.length} канал{channels.length === 1 ? "" : channels.length < 5 ? "а" : "ов"} · {monthFilteredLeads.length} лид{monthFilteredLeads.length === 1 ? "" : monthFilteredLeads.length < 5 ? "а" : "ов"} за {isCurrentMonth ? "месяц" : monthLabel}
            </p>
          </div>
          <button
            onClick={() => setEditChannel({ channel: null })}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
          >
            + Новый канал
          </button>
        </div>

        {/* Filters */}
        {(stores.length > 0 || productTypes.length > 0) && (
          <div className="mb-4 space-y-2">
            {stores.length > 0 && (
              <StoreFilter stores={stores} selectedStoreId={selectedStoreId} onSelect={setSelectedStoreId} />
            )}
            {productTypes.length > 0 && (
              <ProductTypeFilter productTypes={productTypes} selectedProductTypeId={selectedProductTypeId} onSelect={setSelectedProductTypeId} />
            )}
          </div>
        )}

        {/* ─── Month picker ─── */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-sm transition-colors"
            >
              ◂
            </button>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white capitalize min-w-[160px] text-center">
              {monthLabel}
            </h3>
            <button
              onClick={nextMonth}
              className="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-sm transition-colors"
            >
              ▸
            </button>
          </div>
          {!isCurrentMonth && (
            <button
              onClick={goCurrentMonth}
              className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              Текущий месяц
            </button>
          )}
        </div>

        {/* ─── Top stat blocks ─── */}
        <div className={`grid grid-cols-1 ${isCurrentMonth ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4 mb-6`}>

          {/* ═══ Block 1: План на день — only for current month ═══ */}
          {isCurrentMonth && (
          <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border-2 border-indigo-300 dark:border-indigo-700 shadow-lg p-5 ring-2 ring-indigo-200 dark:ring-indigo-800 ring-offset-2 dark:ring-offset-gray-900 flex flex-col">
            <p className="text-[10px] uppercase tracking-wider text-indigo-500 mb-3 font-bold">
              План на день
            </p>
            <div className="flex gap-4 flex-1">
              {/* Left: values */}
              <div className="flex flex-col justify-center space-y-2 min-w-0">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-indigo-400 mb-0.5">План</p>
                  <p className="text-lg font-black text-indigo-700">
                    {dailyLeadPlan}
                  </p>
                  <p className="text-[9px] text-indigo-400">(из месячного плана)</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-indigo-400 mb-0.5">Факт</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">{todayLeads.length}</p>
                </div>
              </div>
              {/* Right: BIG ring */}
              <div className="flex-1 flex items-center justify-center">
                <ProgressRing
                  pct={dailyPct}
                  size="large"
                  color={dailyPct >= 100 ? "#10b981" : dailyPct >= 50 ? "#f59e0b" : "#ef4444"}
                />
              </div>
            </div>
          </div>
          )}

          {/* ═══ Block 2: План на месяц ═══ */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex flex-col">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 font-semibold">План на месяц</p>
            <div className="flex gap-4 flex-1">
              {/* Left: values */}
              <div className="flex flex-col justify-center space-y-2 min-w-0">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">План</p>
                  {editingMonthly ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={monthlyInput}
                        onChange={(e) => setMonthlyInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveMonthly()}
                        onBlur={saveMonthly}
                        className="w-16 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-bold dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => { setMonthlyInput(String(monthlyLeadPlan)); setEditingMonthly(true); }}
                      className="text-lg font-black text-indigo-600 hover:opacity-70 transition-opacity"
                      title="Нажмите для редактирования"
                    >
                      {monthlyLeadPlan}
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Факт</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white">{monthLeads.length}</p>
                </div>
              </div>
              {/* Right: BIG ring */}
              <div className="flex-1 flex items-center justify-center">
                <ProgressRing
                  pct={monthlyPct}
                  size="large"
                  color={monthlyPct >= 100 ? "#10b981" : monthlyPct >= 50 ? "#f59e0b" : "#ef4444"}
                />
              </div>
            </div>
          </div>

          {/* ═══ Block 3: Стоимость привлечения ═══ */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex flex-col">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4 font-semibold">Стоимость привлечения</p>
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Расходы</p>
                  <p className="text-lg font-black text-red-500">
                    {channelExpensesTotal.toLocaleString("ru-RU")} <span className="text-[10px] font-normal text-gray-400">₽</span>
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Стоимость лида</p>
                  <p className="text-lg font-black text-amber-600">
                    {overallCostPerLead !== null ? `${overallCostPerLead.toLocaleString("ru-RU")}` : "—"} <span className="text-[10px] font-normal text-gray-400">₽</span>
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Стоимость результата</p>
                  <p className="text-lg font-black text-teal-600">
                    {overallCostPerResult !== null ? `${overallCostPerResult.toLocaleString("ru-RU")}` : "—"} <span className="text-[10px] font-normal text-gray-400">₽</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Средний чек — compact editable */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Средний чек:</span>
          {editingCheck ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={checkInput}
                onChange={(e) => setCheckInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveCheck()}
                onBlur={saveCheck}
                className="w-20 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-bold dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <span className="text-xs text-gray-400">₽</span>
            </div>
          ) : (
            <button
              onClick={() => { setCheckInput(String(averageCheck)); setEditingCheck(true); }}
              className="text-sm font-bold text-gray-900 dark:text-white dark:text-white hover:text-indigo-600 transition-colors"
              title="Нажмите для редактирования"
            >
              {averageCheck.toLocaleString("ru-RU")} ₽
            </button>
          )}
        </div>

        {/* Group filter */}
        <div className="flex items-center gap-1 mb-5">
          {groupFilters.map((f) => (
            <button
              key={f.id ?? "all"}
              onClick={() => setFilterGroup(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                filterGroup === f.id
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Group stats: expenses, cost per lead per direction */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {groupStats.map((g) => (
            <div
              key={g.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{g.label}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                    {g.leadCount} лид{g.leadCount === 1 ? "" : g.leadCount < 5 ? "а" : "ов"}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {g.channelCount} канал{g.channelCount === 1 ? "" : g.channelCount < 5 ? "а" : "ов"}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Расходы</p>
                  <p className="text-sm font-bold text-red-500">
                    {g.expenses.toLocaleString("ru-RU")} <span className="text-[10px] font-normal text-gray-400">₽</span>
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Стоимость лида</p>
                  <p className="text-sm font-bold text-amber-600">
                    {g.costPerLead !== null ? `${g.costPerLead.toLocaleString("ru-RU")}` : "—"} <span className="text-[10px] font-normal text-gray-400">₽</span>
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">Стоимость результата</p>
                  <p className="text-sm font-bold text-teal-600">
                    {g.costPerResult !== null ? `${g.costPerResult.toLocaleString("ru-RU")}` : "—"} <span className="text-[10px] font-normal text-gray-400">₽</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Channel cards */}
        <ChannelCardList
          channels={channels}
          leads={monthFilteredLeads}
          expenses={monthFilteredExpenses}
          standaloneTasks={standaloneTasks}
          filterGroup={filterGroup}
          onSelectChannel={(ch) => setDetailChannel(ch)}
          onEditChannel={(ch) => setEditChannel({ channel: ch })}
          onDeleteChannel={handleChannelDelete}
        />
      </div>

      {/* ─── Modals ─── */}

      {detailChannel && (
        <ChannelDetailModal
          channel={detailChannel}
          leads={filteredLeads}
          expenses={filteredExpenses}
          standaloneTasks={standaloneTasks}
          employees={teamMembers}
          onEdit={(ch) => { setDetailChannel(null); setEditChannel({ channel: ch }); }}
          onDelete={(id) => { handleChannelDelete(id); setDetailChannel(null); }}
          onToggleTask={handleToggleTask}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onClose={() => setDetailChannel(null)}
        />
      )}

      {editChannel && (
        <ChannelEditModal
          channel={editChannel.channel}
          onSave={handleChannelSave}
          onDelete={editChannel.channel ? handleChannelDelete : undefined}
          onClose={() => setEditChannel(null)}
        />
      )}
    </div>
  );
}

// ─── Reusable Progress Ring ──────────────────────────────────────

function ProgressRing({
  pct,
  size,
  color,
}: {
  pct: number;
  size: "large";
  color: string;
}) {
  // Large size: fills container
  const svgSize = 120;
  const r = 48;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(pct, 100) / 100);

  return (
    <div className="relative" style={{ width: svgSize, height: svgSize }}>
      <svg className="-rotate-90" width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-gray-900 dark:text-white">{pct}%</span>
      </div>
    </div>
  );
}
