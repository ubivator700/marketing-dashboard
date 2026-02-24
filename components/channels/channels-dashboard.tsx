"use client";

import { useState, useCallback, useMemo } from "react";
import type { Channel, ChannelGroup, ChannelTask } from "@/types/dashboard";
import { useAppContext } from "@/lib/app-context";
import {
  addChannel,
  updateChannel,
  deleteChannel as removeChannel,
  addChannelTask,
  toggleChannelTask,
  deleteChannelTask,
} from "@/lib/channel-utils";
import { channelRomi, totalRevenue, leadsByDate, leadsForMonth } from "@/lib/lead-utils";
import { totalExpensesForChannel } from "@/lib/expense-utils";
import ChannelCardList from "./channel-card-list";
import ChannelDetailModal from "./channel-detail-modal";
import ChannelEditModal from "./channel-edit-modal";

export default function ChannelsDashboard() {
  const {
    channels, setChannels,
    leads,
    expenses, setExpenses,
    averageCheck, setAverageCheck,
    monthlyLeadPlan, setMonthlyLeadPlan,
    dailyLeadPlan,
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

  // ─── Financials ───
  const channelIds = useMemo(() => channels.map((c) => c.id), [channels]);
  const totalRev = useMemo(() => totalRevenue(leads, channelIds, averageCheck), [leads, channelIds, averageCheck]);
  const channelExpensesTotal = useMemo(() => {
    return channels.reduce((sum, c) => sum + totalExpensesForChannel(expenses, c.id), 0);
  }, [channels, expenses]);
  const overallRomi = useMemo(() => channelRomi(totalRev, channelExpensesTotal), [totalRev, channelExpensesTotal]);

  // ─── Daily/monthly leads ───
  const todayKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);
  const todayLeads = useMemo(() => leadsByDate(leads, todayKey), [leads, todayKey]);
  const now = new Date();
  const monthLeads = useMemo(() => leadsForMonth(leads, now.getFullYear(), now.getMonth()), [leads]);

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

  // ─── Channel tasks ───
  const handleToggleTask = useCallback(
    (channelId: number, taskId: number) => setChannels((prev) => toggleChannelTask(prev, channelId, taskId)),
    [setChannels]
  );
  const handleAddTask = useCallback(
    (channelId: number, task: ChannelTask) => setChannels((prev) => addChannelTask(prev, channelId, task)),
    [setChannels]
  );
  const handleDeleteTask = useCallback(
    (channelId: number, taskId: number) => setChannels((prev) => deleteChannelTask(prev, channelId, taskId)),
    [setChannels]
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
      const income = totalRevenue(leads, groupChannelIds, averageCheck);
      const groupExpenses = groupChannels.reduce(
        (sum, c) => sum + totalExpensesForChannel(expenses, c.id),
        0
      );
      const romi = channelRomi(income, groupExpenses);
      const leadCount = leads.filter((l) => groupChannelIds.includes(l.channelId)).length;
      return {
        id: g.id,
        label: g.label,
        channelCount: groupChannels.length,
        leadCount,
        income,
        expenses: groupExpenses,
        romi,
      };
    });
  }, [channels, leads, expenses, averageCheck]);

  const profit = totalRev - channelExpensesTotal;
  const dailyPct = dailyLeadPlan > 0 ? Math.min(100, Math.round((todayLeads.length / dailyLeadPlan) * 100)) : 0;
  const monthlyPct = monthlyLeadPlan > 0 ? Math.min(100, Math.round((monthLeads.length / monthlyLeadPlan) * 100)) : 0;

  // ─── Balance bar calculation ───
  // The bar represents the financial balance. Center = ROMI 100% (breakeven: revenue = 2 × expenses).
  // Left end = all expenses, no revenue. Right end = huge profit.
  // Position: revenue / (revenue + expenses) maps to the bar.
  // Center (50%) = breakeven = revenue equals expenses × 2 (ROMI = 100%)
  // We use: position = revenue / (revenue + expenses) if expenses > 0
  // But ROMI 100% means revenue = 2*expenses, so position at ROMI=100% should be center.
  // Let's define: balance = revenue / (2 * expenses) clamped 0..1, center = 0.5
  // If expenses = 0 and revenue > 0, full green.
  const balanceRatio = useMemo(() => {
    if (channelExpensesTotal === 0 && totalRev === 0) return 0.5;
    if (channelExpensesTotal === 0) return 1;
    // At ROMI=100%, revenue = 2*expenses, ratio = 1 → maps to center (0.5)
    // At ROMI=0%, revenue = expenses, ratio = 0.5 → maps to 0.25
    // At ROMI=-100%, revenue = 0, ratio = 0 → maps to 0
    // At ROMI=200%, revenue = 3*expenses, ratio = 1.5 → maps to 0.75
    const ratio = totalRev / (2 * channelExpensesTotal);
    return Math.min(Math.max(ratio, 0), 1);
  }, [totalRev, channelExpensesTotal]);

  const balancePct = Math.round(balanceRatio * 100);
  const isProfit = profit >= 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Рекламные каналы</h1>
            <p className="text-sm text-gray-500 mt-1">
              {channels.length} канал{channels.length === 1 ? "" : channels.length < 5 ? "а" : "ов"} · {leads.length} лид{leads.length === 1 ? "" : leads.length < 5 ? "а" : "ов"}
            </p>
          </div>
          <button
            onClick={() => setEditChannel({ channel: null })}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
          >
            + Новый канал
          </button>
        </div>

        {/* ─── Top stat blocks: 3 columns ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          {/* ═══ Block 1: План на день — HIGHLIGHTED ═══ */}
          <div className="bg-indigo-50 rounded-2xl border-2 border-indigo-300 shadow-lg p-5 ring-2 ring-indigo-200 ring-offset-2 flex flex-col">
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
                  <p className="text-lg font-black text-gray-900">{todayLeads.length}</p>
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

          {/* ═══ Block 2: План на месяц ═══ */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-3 font-semibold">План на месяц</p>
            <div className="flex gap-4 flex-1">
              {/* Left: values */}
              <div className="flex flex-col justify-center space-y-2 min-w-0">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">План</p>
                  {editingMonthly ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={monthlyInput}
                        onChange={(e) => setMonthlyInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveMonthly()}
                        onBlur={saveMonthly}
                        className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Факт</p>
                  <p className="text-lg font-black text-gray-900">{monthLeads.length}</p>
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

          {/* ═══ Block 3: Финансы — balance bar ═══ */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-4 font-semibold">Финансы</p>
            <div className="flex-1 flex flex-col justify-between">
              {/* Values row */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">Доходы</p>
                  <p className="text-lg font-black text-green-600">
                    {totalRev.toLocaleString("ru-RU")} <span className="text-[10px] font-normal text-gray-400">₽</span>
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">Расходы</p>
                  <p className="text-lg font-black text-red-500">
                    {channelExpensesTotal.toLocaleString("ru-RU")} <span className="text-[10px] font-normal text-gray-400">₽</span>
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">ROMI</p>
                  <p className={`text-lg font-black ${overallRomi !== null && overallRomi >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {overallRomi !== null ? `${overallRomi}%` : "—"}
                  </p>
                </div>
              </div>

              {/* Balance bar */}
              <div className="mt-4">
                <div className="relative">
                  {/* Bar track */}
                  <div className="h-3 rounded-full overflow-hidden flex" style={{ background: "linear-gradient(to right, #fecaca, #fef3c7 40%, #d1fae5 60%, #bbf7d0)" }}>
                    {/* Fill indicator */}
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${isProfit ? "bg-green-500" : "bg-red-400"}`}
                      style={{ width: `${balancePct}%` }}
                    />
                  </div>
                  {/* Center mark = ROMI 100% */}
                  <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="w-0.5 h-3 bg-gray-800" />
                  </div>
                </div>
                {/* Labels under bar */}
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[9px] text-red-400 font-medium">Убыток</span>
                  <span className="text-[9px] text-gray-500 font-semibold">ROMI 100%</span>
                  <span className="text-[9px] text-green-500 font-medium">Прибыль</span>
                </div>
                {/* Profit summary */}
                <div className="text-center mt-2">
                  <span className={`text-sm font-bold ${isProfit ? "text-green-600" : "text-red-500"}`}>
                    {isProfit ? "+" : ""}{profit.toLocaleString("ru-RU")} ₽
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Средний чек — compact editable */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Средний чек:</span>
          {editingCheck ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={checkInput}
                onChange={(e) => setCheckInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveCheck()}
                onBlur={saveCheck}
                className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <span className="text-xs text-gray-400">₽</span>
            </div>
          ) : (
            <button
              onClick={() => { setCheckInput(String(averageCheck)); setEditingCheck(true); }}
              className="text-sm font-bold text-gray-900 hover:text-indigo-600 transition-colors"
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
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Group stats: income, expenses, ROMI per direction */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {groupStats.map((g) => (
            <div
              key={g.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900">{g.label}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {g.leadCount} лид{g.leadCount === 1 ? "" : g.leadCount < 5 ? "а" : "ов"}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {g.channelCount} канал{g.channelCount === 1 ? "" : g.channelCount < 5 ? "а" : "ов"}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">Доходы</p>
                  <p className="text-sm font-bold text-green-600">
                    {g.income.toLocaleString("ru-RU")} <span className="text-[10px] font-normal text-gray-400">₽</span>
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">Расходы</p>
                  <p className="text-sm font-bold text-red-500">
                    {g.expenses.toLocaleString("ru-RU")} <span className="text-[10px] font-normal text-gray-400">₽</span>
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400">ROMI</p>
                  <p className={`text-sm font-bold ${g.romi !== null && g.romi >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {g.romi !== null ? `${g.romi}%` : "—"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Channel cards */}
        <ChannelCardList
          channels={channels}
          leads={leads}
          expenses={expenses}
          averageCheck={averageCheck}
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
          leads={leads}
          expenses={expenses}
          averageCheck={averageCheck}
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
        <span className="text-2xl font-black text-gray-900">{pct}%</span>
      </div>
    </div>
  );
}
