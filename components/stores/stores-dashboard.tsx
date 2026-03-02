"use client";

import { useState, useCallback, useMemo } from "react";
import type { Store, Lead, Expense } from "@/types/dashboard";
import { useAppContext } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import {
  CHANNEL_COLORS,
  PRODUCT_COLORS,
} from "@/lib/overview-utils";

// ─── Helpers ────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("ru-RU");
}

function fmtShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}М`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}к`;
  return String(n);
}

function currentMonthPrefix(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

// ─── Main Component ─────────────────────────────────────────────

export default function StoresDashboard() {
  const {
    stores, setStores, leads, expenses, channels, productTypes,
  } = useAppContext();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editTbu, setEditTbu] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTbu, setNewTbu] = useState("");

  // TBU inline edit
  const [editingTbuId, setEditingTbuId] = useState<number | null>(null);
  const [tbuInput, setTbuInput] = useState("");

  const prefix = useMemo(() => currentMonthPrefix(), []);
  const now = new Date();
  const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  // ─── Handlers ───────────────────────────────────────────────

  const handleStartEdit = (store: Store) => {
    setEditingId(store.id);
    setEditName(store.name);
    setEditTbu(String(store.tbu || 0));
  };

  const handleSaveEdit = useCallback(() => {
    if (!editName.trim() || editingId === null) return;
    setStores((prev) =>
      prev.map((s) =>
        s.id === editingId
          ? { ...s, name: editName.trim(), tbu: Number(editTbu) || 0 }
          : s
      )
    );
    setEditingId(null);
    setEditName("");
    setEditTbu("");
  }, [editingId, editName, editTbu, setStores]);

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    const maxId = stores.reduce((max, s) => Math.max(max, s.id), 0);
    setStores((prev) => [
      ...prev,
      { id: maxId + 1, name: newName.trim(), tbu: Number(newTbu) || 0 },
    ]);
    setNewName("");
    setNewTbu("");
    setCreating(false);
  }, [newName, newTbu, stores, setStores]);

  const handleDelete = useCallback(
    (storeId: number) => {
      const leadsCount = leads.filter((l) => l.storeId === storeId).length;
      const expensesCount = expenses.filter((e) => e.storeId === storeId).length;
      let msg = `Удалить магазин?`;
      if (leadsCount > 0 || expensesCount > 0) {
        msg += `\n\nК этой точке привязано ${leadsCount} лид(ов) и ${expensesCount} расход(ов). Они потеряют привязку к магазину.`;
      }
      if (!confirm(msg)) return;
      setStores((prev) => prev.filter((s) => s.id !== storeId));
    },
    [leads, expenses, setStores]
  );

  const handleSaveTbu = useCallback(
    (storeId: number) => {
      setStores((prev) =>
        prev.map((s) =>
          s.id === storeId ? { ...s, tbu: Number(tbuInput) || 0 } : s
        )
      );
      setEditingTbuId(null);
    },
    [tbuInput, setStores]
  );

  // ─── Pre-compute stats ────────────────────────────────────────

  const storeStats = useMemo(() => {
    const map = new Map<
      number,
      {
        monthLeads: Lead[];
        monthExpenses: Expense[];
        totalLeads: number;
        totalExpenses: number;
        results: number;
        measurements: number;
        sales: number;
        conversion: number;
        costPerLead: number | null;
        costPerResult: number | null;
        channelBreakdown: { id: number; name: string; leads: number; color: string }[];
        productBreakdown: { id: number; name: string; leads: number; color: string }[];
      }
    >();

    for (const store of stores) {
      const monthLeads = leads.filter(
        (l) => l.storeId === store.id && l.date.startsWith(prefix)
      );
      const monthExpenses = expenses.filter(
        (e) => e.storeId === store.id && e.date.startsWith(prefix)
      );

      const totalLeads = monthLeads.length;
      const totalExpensesAmount = monthExpenses.reduce((s, e) => s + e.amount, 0);
      const measurements = monthLeads.filter((l) => l.result === "measurement").length;
      const sales = monthLeads.filter((l) => l.result === "sale").length;
      const results = measurements + sales;
      const conversion = totalLeads > 0 ? Math.round((results / totalLeads) * 100) : 0;
      const costPerLead = totalLeads > 0 ? Math.round(totalExpensesAmount / totalLeads) : null;
      const costPerResult = results > 0 ? Math.round(totalExpensesAmount / results) : null;

      // Channel breakdown
      const channelBreakdown = channels
        .map((ch, ci) => ({
          id: ch.id,
          name: ch.name,
          leads: monthLeads.filter((l) => l.channelId === ch.id).length,
          color: CHANNEL_COLORS[ci % CHANNEL_COLORS.length],
        }))
        .filter((c) => c.leads > 0)
        .sort((a, b) => b.leads - a.leads);

      // Product breakdown
      const productBreakdown = productTypes
        .map((pt, pi) => ({
          id: pt.id,
          name: pt.name,
          leads: monthLeads.filter((l) => l.productTypeIds.includes(pt.id)).length,
          color: PRODUCT_COLORS[pi % PRODUCT_COLORS.length],
        }))
        .filter((p) => p.leads > 0)
        .sort((a, b) => b.leads - a.leads);

      map.set(store.id, {
        monthLeads,
        monthExpenses,
        totalLeads,
        totalExpenses: totalExpensesAmount,
        results,
        measurements,
        sales,
        conversion,
        costPerLead,
        costPerResult,
        channelBreakdown,
        productBreakdown,
      });
    }

    return map;
  }, [stores, leads, expenses, channels, productTypes, prefix]);

  // ─── Render ─────────────────────────────────────────────────

  const inputClass =
    "px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white";

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Магазины</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Торговые точки компании · {stores.length}{" "}
            {stores.length === 1 ? "точка" : stores.length < 5 ? "точки" : "точек"}
            {" · "}{monthLabel}
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            + Новый магазин
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-indigo-200 dark:border-indigo-700 p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Новый магазин</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Название</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setCreating(false);
                }}
                placeholder="Название точки..."
                autoFocus
                className={inputClass + " w-full"}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                ТБУ (точка безубыточности), \u20bd
              </label>
              <input
                type="number"
                value={newTbu}
                onChange={(e) => setNewTbu(e.target.value)}
                placeholder="0"
                className={inputClass + " w-full"}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              Создать
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setNewName("");
                setNewTbu("");
              }}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {stores.length === 0 && !creating && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <span className="text-4xl mb-3 block">{"\ud83c\udfea"}</span>
          <p className="text-gray-400 text-sm">Нет магазинов. Создайте первую торговую точку.</p>
        </div>
      )}

      {/* Store cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {stores.map((store) => {
          const stats = storeStats.get(store.id);
          if (!stats) return null;

          const tbuPercent =
            store.tbu > 0 ? Math.min(Math.round((stats.totalExpenses / store.tbu) * 100), 100) : 0;
          const tbuReached = store.tbu > 0 && stats.totalExpenses >= store.tbu;

          return (
            <div
              key={store.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              {/* Store header */}
              <div className="px-5 pt-5 pb-3">
                {editingId === store.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Название
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                          className={inputClass + " w-full"}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          ТБУ, {"\u20bd"}
                        </label>
                        <input
                          type="number"
                          value={editTbu}
                          onChange={(e) => setEditTbu(e.target.value)}
                          className={inputClass + " w-full"}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Сохранить
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{"\ud83c\udfea"}</span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{store.name}</h3>
                      </div>
                      {/* TBU display */}
                      <div className="mt-1.5 ml-8 flex items-center gap-2">
                        {editingTbuId === store.id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500">ТБУ:</span>
                            <input
                              type="number"
                              value={tbuInput}
                              onChange={(e) => setTbuInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveTbu(store.id);
                                if (e.key === "Escape") setEditingTbuId(null);
                              }}
                              autoFocus
                              className="w-24 px-2 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <span className="text-xs text-gray-400">{"\u20bd"}</span>
                            <button
                              onClick={() => handleSaveTbu(store.id)}
                              className="text-[10px] text-indigo-600 font-medium hover:text-indigo-800"
                            >
                              OK
                            </button>
                            <button
                              onClick={() => setEditingTbuId(null)}
                              className="text-[10px] text-gray-400 hover:text-gray-600"
                            >
                              {"\u00d7"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400 dark:text-gray-500">ТБУ:</span>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {store.tbu > 0 ? `${fmt(store.tbu)} \u20bd` : "не задан"}
                            </span>
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setEditingTbuId(store.id);
                                  setTbuInput(String(store.tbu || 0));
                                }}
                                className="text-gray-300 hover:text-indigo-500 transition-colors"
                                title="Изменить ТБУ"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3 w-3"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(store)}
                        className="p-1.5 text-gray-300 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                        title="Редактировать"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(store.id)}
                        className="p-1.5 text-gray-300 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                        title="Удалить"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Statistics section */}
              {editingId !== store.id && (
                <div className="px-5 pb-5 space-y-4">
                  {/* Metric pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    <MetricPill label="Лиды" value={String(stats.totalLeads)} color="indigo" />
                    <MetricPill
                      label="Результаты"
                      value={String(stats.results)}
                      sub={`${stats.measurements} зам. · ${stats.sales} прод.`}
                      color="violet"
                    />
                    <MetricPill
                      label="Расходы"
                      value={`${fmtShort(stats.totalExpenses)} \u20bd`}
                      color="red"
                    />
                    <MetricPill
                      label="Стоимость лида"
                      value={stats.costPerLead !== null ? `${fmtShort(stats.costPerLead)} \u20bd` : "—"}
                      color="amber"
                    />
                    <MetricPill
                      label="Стоим. результата"
                      value={stats.costPerResult !== null ? `${fmtShort(stats.costPerResult)} \u20bd` : "—"}
                      color="teal"
                    />
                  </div>

                  {/* TBU progress bar */}
                  {store.tbu > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                          Выполнение ТБУ
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            tbuReached ? "text-emerald-600 dark:text-emerald-400" : "text-gray-600 dark:text-gray-300"
                          }`}
                        >
                          {fmt(stats.totalExpenses)} / {fmt(store.tbu)} {"\u20bd"}
                          <span className="ml-1 text-[10px] font-medium">
                            ({tbuPercent}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            tbuReached
                              ? "bg-emerald-500"
                              : tbuPercent >= 70
                              ? "bg-amber-400"
                              : tbuPercent >= 40
                              ? "bg-indigo-400"
                              : "bg-indigo-300"
                          }`}
                          style={{ width: `${Math.max(tbuPercent, 0)}%` }}
                        />
                      </div>
                      {tbuReached && (
                        <p className="text-[10px] text-emerald-600 font-medium mt-1">
                          {"\u2705"} ТБУ достигнута
                        </p>
                      )}
                    </div>
                  )}

                  {/* Breakdowns */}
                  {(stats.channelBreakdown.length > 0 ||
                    stats.productBreakdown.length > 0) && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <BreakdownSection
                        title="Каналы"
                        items={stats.channelBreakdown}
                      />
                      <BreakdownSection
                        title="Товары"
                        items={stats.productBreakdown}
                      />
                    </div>
                  )}

                  {/* No data */}
                  {stats.totalLeads === 0 && (
                    <p className="text-xs text-gray-300 text-center py-1">
                      Нет данных за текущий месяц
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Metric Pill ────────────────────────────────────────────────

const PILL_COLORS: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  red: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  teal: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
};

function MetricPill({
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
  const c = PILL_COLORS[color] || PILL_COLORS.indigo;
  return (
    <div className={`${c} rounded-xl px-3 py-2.5`}>
      <p className="text-[10px] uppercase tracking-wider font-medium opacity-60 mb-0.5">
        {label}
      </p>
      <p className="text-sm font-bold leading-tight">{value}</p>
      {sub && <p className="text-[10px] opacity-50 leading-tight">{sub}</p>}
    </div>
  );
}

// ─── Breakdown Section ──────────────────────────────────────────

function BreakdownSection({
  title,
  items,
}: {
  title: string;
  items: { id: number; name: string; leads: number; color: string }[];
}) {
  if (items.length === 0) {
    return (
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-300 dark:text-gray-600 font-semibold mb-1.5">
          {title}
        </p>
        <p className="text-[10px] text-gray-300 dark:text-gray-600">{"\u2014"}</p>
      </div>
    );
  }

  const maxLeads = Math.max(...items.map((i) => i.leads), 1);

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-2">
        {title}
      </p>
      <div className="space-y-1.5">
        {items.slice(0, 5).map((item) => (
          <div key={item.id} className="flex items-center gap-1.5">
            <span
              className="text-[10px] text-gray-500 dark:text-gray-400 w-16 truncate flex-shrink-0"
              title={item.name}
            >
              {item.name}
            </span>
            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-600 rounded-full overflow-hidden">
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
