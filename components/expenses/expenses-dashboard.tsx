"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import type { Expense } from "@/types/dashboard";
import { useAppContext } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { totalExpenses as calcTotal, totalExpensesForChannel } from "@/lib/expense-utils";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import ExpenseTable from "./expense-table";
import ExpenseEditModal from "./expense-edit-modal";
import StoreFilter from "@/components/ui/store-filter";

const PIE_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#84cc16"];

export default function ExpensesDashboard() {
  const {
    projects, expenses, setExpenses, monthlyBudget, setMonthlyBudget, channels,
    stores, selectedStoreId, setSelectedStoreId, filteredExpenses,
  } = useAppContext();
  const { user } = useAuth();
  const role = user?.role;
  const [editing, setEditing] = useState<Expense | null | "create">(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [channelBreakdownOpen, setChannelBreakdownOpen] = useState(false);
  const [projectBreakdownOpen, setProjectBreakdownOpen] = useState(false);

  const total = calcTotal(filteredExpenses);
  const grandTotal = total;

  // Current month prefix (e.g. "2026-02")
  const currentMonthPrefix = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  // Sum of expenses for the current month
  const spentThisMonth = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.date.startsWith(currentMonthPrefix))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses, currentMonthPrefix]);

  // Budget progress
  const budgetPct = monthlyBudget > 0 ? Math.round((spentThisMonth / monthlyBudget) * 100) : 0;
  const budgetBarColor =
    budgetPct > 100 ? "bg-red-500" : budgetPct >= 80 ? "bg-yellow-500" : "bg-green-500";

  // ─── CRUD ───
  const handleSave = useCallback(
    (expense: Expense) => {
      setExpenses((prev) => {
        const exists = prev.some((e) => e.id === expense.id);
        if (exists) return prev.map((e) => (e.id === expense.id ? expense : e));
        return [...prev, expense];
      });
      setEditing(null);
    },
    [setExpenses]
  );

  const handleDelete = useCallback(
    (expenseId: number) => {
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      setEditing(null);
    },
    [setExpenses]
  );

  // Budget inline edit handlers
  const handleBudgetEditStart = () => {
    setBudgetDraft(String(monthlyBudget));
    setEditingBudget(true);
  };

  const handleBudgetEditSave = () => {
    const val = parseFloat(budgetDraft);
    if (!isNaN(val) && val >= 0) {
      setMonthlyBudget(val);
    }
    setEditingBudget(false);
  };

  const handleBudgetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleBudgetEditSave();
    if (e.key === "Escape") setEditingBudget(false);
  };

  // Count expenses per project for stats
  const projectExpenseStats = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of filteredExpenses) {
      if (e.projectId !== null) {
        map.set(e.projectId, (map.get(e.projectId) ?? 0) + e.amount);
      }
    }
    return map;
  }, [filteredExpenses]);

  // Count expenses per channel for stats
  const channelExpenseStats = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of filteredExpenses) {
      if (e.channelId !== null && e.channelId !== undefined) {
        map.set(e.channelId, (map.get(e.channelId) ?? 0) + e.amount);
      }
    }
    return map;
  }, [filteredExpenses]);

  // Monthly expenses filtered by current month
  const monthlyExpenses = useMemo(() => {
    return filteredExpenses.filter((e) => e.date.startsWith(currentMonthPrefix));
  }, [filteredExpenses, currentMonthPrefix]);

  const monthlyTotal = useMemo(() => monthlyExpenses.reduce((s, e) => s + e.amount, 0), [monthlyExpenses]);

  // Pie chart data: by responsible
  const pieByResponsible = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of monthlyExpenses) {
      map.set(e.responsible || "Без ответственного", (map.get(e.responsible || "Без ответственного") ?? 0) + e.amount);
    }
    return Array.from(map.entries()).map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [monthlyExpenses]);

  // Pie chart data: by channel
  const pieByChannel = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of monthlyExpenses) {
      const ch = e.channelId ? channels.find((c) => c.id === e.channelId)?.name || "Неизвестный" : "Без канала";
      map.set(ch, (map.get(ch) ?? 0) + e.amount);
    }
    return Array.from(map.entries()).map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [monthlyExpenses, channels]);

  // Pie chart data: by project
  const pieByProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of monthlyExpenses) {
      const p = e.projectId ? projects.find((pr) => pr.id === e.projectId)?.name || "Неизвестный" : "Без проекта";
      map.set(p, (map.get(p) ?? 0) + e.amount);
    }
    return Array.from(map.entries()).map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [monthlyExpenses, projects]);

  // Pie chart data: by store
  const pieByStore = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of monthlyExpenses) {
      const s = e.storeId ? stores.find((st) => st.id === e.storeId)?.name || "Неизвестный" : "Без магазина";
      map.set(s, (map.get(s) ?? 0) + e.amount);
    }
    return Array.from(map.entries()).map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [monthlyExpenses, stores]);

  const [statsOpen, setStatsOpen] = useState(false);

  // Export month stats to Excel
  const handleExportMonthStats = useCallback(async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Расходы за месяц");
    ws.columns = [
      { header: "Название", key: "name", width: 30 },
      { header: "Сумма", key: "amount", width: 15 },
      { header: "Ответственный", key: "responsible", width: 20 },
      { header: "Дата", key: "date", width: 12 },
      { header: "Канал", key: "channel", width: 20 },
      { header: "Проект", key: "project", width: 20 },
      { header: "Магазин", key: "store", width: 20 },
    ];
    for (const e of monthlyExpenses) {
      ws.addRow({
        name: e.name,
        amount: e.amount,
        responsible: e.responsible,
        date: e.date,
        channel: e.channelId ? channels.find((c) => c.id === e.channelId)?.name || "" : "",
        project: e.projectId ? projects.find((p) => p.id === e.projectId)?.name || "" : "",
        store: e.storeId ? stores.find((s) => s.id === e.storeId)?.name || "" : "",
      });
    }
    // Style header
    ws.getRow(1).font = { bold: true };
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_${currentMonthPrefix}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }, [monthlyExpenses, channels, projects, stores, currentMonthPrefix]);

  // ─── Excel import ───
  const handleDownloadTemplate = async () => {
    const res = await fetch("/api/expenses/template");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses_template.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/expenses/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setImportResult({ inserted: 0, errors: [data.error ?? "Неизвестная ошибка"] });
      } else {
        setImportResult({ inserted: data.inserted, errors: data.errors ?? [] });
        // Add imported expenses to state
        if (data.expenses && data.expenses.length > 0) {
          setExpenses((prev: Expense[]) => [...prev, ...data.expenses]);
        }
      }
    } catch {
      setImportResult({ inserted: 0, errors: ["Ошибка сети"] });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Расходы</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Общая сумма: <span className="font-semibold text-gray-800 dark:text-gray-200">{grandTotal.toLocaleString("ru-RU")} ₽</span>
            {" · "}{filteredExpenses.length} запис{filteredExpenses.length === 1 ? "ь" : filteredExpenses.length < 5 ? "и" : "ей"}
          </p>
        </div>

        {/* Store filter */}
        {stores.length > 0 && (
          <div className="mb-4">
            <StoreFilter stores={stores} selectedStoreId={selectedStoreId} onSelect={setSelectedStoreId} />
          </div>
        )}

        {/* Budget section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            {/* Budget per month */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Бюджет на месяц</p>
              <div className="flex items-center gap-2 mt-1">
                {editingBudget ? (
                  <input
                    type="number"
                    value={budgetDraft}
                    onChange={(e) => setBudgetDraft(e.target.value)}
                    onBlur={handleBudgetEditSave}
                    onKeyDown={handleBudgetKeyDown}
                    autoFocus
                    className="w-36 text-xl font-bold text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{monthlyBudget.toLocaleString("ru-RU")} ₽</p>
                )}
                {role === "admin" && !editingBudget && (
                  <button
                    onClick={handleBudgetEditStart}
                    className="text-gray-400 hover:text-indigo-600 transition-colors"
                    title="Редактировать бюджет"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Spent this month */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Потрачено за месяц</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{spentThisMonth.toLocaleString("ru-RU")} ₽</p>
            </div>

            {/* Progress bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Использовано</p>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{budgetPct}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`${budgetBarColor} h-3 rounded-full transition-all`}
                  style={{ width: `${Math.min(budgetPct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Monthly statistics with pie charts + channel summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
          <div
            onClick={() => setStatsOpen((v) => !v)}
            className="w-full flex items-center justify-between p-5 text-left cursor-pointer"
          >
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">Статистика за месяц</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{monthlyTotal.toLocaleString("ru-RU")} ₽</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleExportMonthStats(); }}
                className="px-2 py-1 text-[10px] font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                Excel
              </button>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform ${statsOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          {statsOpen && (
            <div className="px-5 pb-5 space-y-5">
              {/* Channel spending summary */}
              {pieByChannel.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wide">Расходы по рекламным каналам</p>
                  <div className="space-y-1.5">
                    {pieByChannel.sort((a, b) => b.value - a.value).map((item, i) => {
                      const pct = monthlyTotal > 0 ? Math.round((item.value / monthlyTotal) * 100) : 0;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 min-w-0 truncate">{item.name}</span>
                          <div className="w-28 bg-gray-100 dark:bg-gray-700 rounded-full h-2 hidden sm:block">
                            <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white w-28 text-right">{item.value.toLocaleString("ru-RU")} ₽</span>
                          <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pie charts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <PieChartBlock title="По ответственным" data={pieByResponsible} />
                <PieChartBlock title="По каналам" data={pieByChannel} />
                <PieChartBlock title="По проектам" data={pieByProject} />
                <PieChartBlock title="По магазинам" data={pieByStore} />
              </div>
            </div>
          )}
        </div>

        {/* Channel breakdown (all time) */}
        {channelExpenseStats.size > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
            <button
              onClick={() => setChannelBreakdownOpen((v) => !v)}
              className="w-full flex items-center justify-between p-5 text-left"
            >
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">Расходы по рекламным каналам (все время)</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {Array.from(channelExpenseStats.values()).reduce((a, b) => a + b, 0).toLocaleString("ru-RU")} ₽
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${channelBreakdownOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            </button>
            {channelBreakdownOpen && (
              <div className="px-5 pb-5 space-y-2">
                {Array.from(channelExpenseStats.entries()).map(([cid, amount]) => {
                  const channel = channels.find((c) => c.id === cid);
                  const pct = grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0;
                  return (
                    <div key={cid} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 min-w-0 truncate">{channel?.name ?? "Неизвестный"}</span>
                      <div className="w-24 bg-gray-100 dark:bg-gray-700 rounded-full h-2 hidden sm:block">
                        <div
                          className="bg-indigo-500 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white w-28 text-right">{amount.toLocaleString("ru-RU")} ₽</span>
                      <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Project breakdown (all time) */}
        {projectExpenseStats.size > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
            <button
              onClick={() => setProjectBreakdownOpen((v) => !v)}
              className="w-full flex items-center justify-between p-5 text-left"
            >
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">Расходы по проектам (все время)</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {Array.from(projectExpenseStats.values()).reduce((a, b) => a + b, 0).toLocaleString("ru-RU")} ₽
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform ${projectBreakdownOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </div>
            </button>
            {projectBreakdownOpen && (
              <div className="px-5 pb-5 space-y-2">
                {Array.from(projectExpenseStats.entries()).map(([pid, amount]) => {
                  const project = projects.find((p) => p.id === pid);
                  const pct = grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0;
                  return (
                    <div key={pid} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1 min-w-0 truncate">{project?.name ?? "Неизвестный"}</span>
                      <div className="w-24 bg-gray-100 dark:bg-gray-700 rounded-full h-2 hidden sm:block">
                        <div
                          className="bg-indigo-500 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white w-28 text-right">{amount.toLocaleString("ru-RU")} ₽</span>
                      <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Import result toast */}
        {importResult && (
          <div className={`mb-4 p-4 rounded-xl border ${importResult.errors.length > 0 && importResult.inserted === 0 ? "bg-red-50 border-red-200" : importResult.errors.length > 0 ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}`}>
            <div className="flex items-center justify-between">
              <div>
                {importResult.inserted > 0 && (
                  <p className="text-sm font-medium text-green-800">
                    ✅ Импортировано: {importResult.inserted} запис{importResult.inserted === 1 ? "ь" : importResult.inserted < 5 ? "и" : "ей"}
                  </p>
                )}
                {importResult.errors.length > 0 && (
                  <div className="mt-1">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-600">{err}</p>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 mb-4">
          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            title="Скачать шаблон Excel"
          >
            📥 Шаблон
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors shadow-sm disabled:opacity-50"
            title="Импорт расходов из Excel"
          >
            {importing ? "⏳ Импорт..." : "📤 Импорт Excel"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={() => setEditing("create")}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            + Новый расход
          </button>
        </div>

        {/* Table */}
        <ExpenseTable
          expenses={filteredExpenses}
          projects={projects}
          channels={channels}
          stores={stores}
          total={total}
          onEdit={(expense) => setEditing(expense)}
          onDelete={handleDelete}
        />
      </div>

      {/* Modal */}
      {editing !== null && (
        <ExpenseEditModal
          expense={editing === "create" ? null : editing}
          onSave={handleSave}
          onDelete={editing !== "create" ? handleDelete : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function PieChartBlock({ title, data }: { title: string; data: { name: string; value: number; color: string }[] }) {
  if (data.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-2">{title}</p>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }: any) => `${String(name).slice(0, 10)} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={9}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v: any) => `${Number(v).toLocaleString("ru-RU")} ₽`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
