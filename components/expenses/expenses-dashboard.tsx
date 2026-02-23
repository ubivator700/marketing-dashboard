"use client";

import { useState, useMemo, useCallback } from "react";
import type { Expense } from "@/types/dashboard";
import { useAppContext } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { totalExpenses as calcTotal, totalExpensesForChannel } from "@/lib/expense-utils";
import ExpenseTable from "./expense-table";
import ExpenseEditModal from "./expense-edit-modal";

export default function ExpensesDashboard() {
  const { projects, expenses, setExpenses, monthlyBudget, setMonthlyBudget, channels } = useAppContext();
  const { user } = useAuth();
  const role = user?.role;
  const [editing, setEditing] = useState<Expense | null | "create">(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState<string>("");
  const [channelBreakdownOpen, setChannelBreakdownOpen] = useState(false);
  const [projectBreakdownOpen, setProjectBreakdownOpen] = useState(false);

  const total = calcTotal(expenses);
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
    return expenses
      .filter((e) => e.date.startsWith(currentMonthPrefix))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, currentMonthPrefix]);

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
    for (const e of expenses) {
      if (e.projectId !== null) {
        map.set(e.projectId, (map.get(e.projectId) ?? 0) + e.amount);
      }
    }
    return map;
  }, [expenses]);

  // Count expenses per channel for stats
  const channelExpenseStats = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of expenses) {
      if (e.channelId !== null && e.channelId !== undefined) {
        map.set(e.channelId, (map.get(e.channelId) ?? 0) + e.amount);
      }
    }
    return map;
  }, [expenses]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Расходы</h1>
          <p className="text-sm text-gray-500 mt-1">
            Общая сумма: <span className="font-semibold text-gray-800">{grandTotal.toLocaleString("ru-RU")} ₽</span>
            {" · "}{expenses.length} запис{expenses.length === 1 ? "ь" : expenses.length < 5 ? "и" : "ей"}
          </p>
        </div>

        {/* Budget section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-wrap items-center gap-6">
            {/* Budget per month */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Бюджет на месяц</p>
              <div className="flex items-center gap-2 mt-1">
                {editingBudget ? (
                  <input
                    type="number"
                    value={budgetDraft}
                    onChange={(e) => setBudgetDraft(e.target.value)}
                    onBlur={handleBudgetEditSave}
                    onKeyDown={handleBudgetKeyDown}
                    autoFocus
                    className="w-36 text-xl font-bold text-gray-900 border border-gray-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-xl font-bold text-gray-900">{monthlyBudget.toLocaleString("ru-RU")} ₽</p>
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
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Потрачено за месяц</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{spentThisMonth.toLocaleString("ru-RU")} ₽</p>
            </div>

            {/* Progress bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Использовано</p>
                <span className="text-sm font-semibold text-gray-700">{budgetPct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className={`${budgetBarColor} h-3 rounded-full transition-all`}
                  style={{ width: `${Math.min(budgetPct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Channel breakdown */}
        {channelExpenseStats.size > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <button
              onClick={() => setChannelBreakdownOpen((v) => !v)}
              className="w-full flex items-center justify-between p-5 text-left"
            >
              <h2 className="text-sm font-bold text-gray-700">Расходы по рекламным каналам</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">
                  {Array.from(channelExpenseStats.values()).reduce((a, b) => a + b, 0).toLocaleString("ru-RU")} ₽
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 text-gray-400 transition-transform ${channelBreakdownOpen ? "rotate-180" : ""}`}
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
                      <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{channel?.name ?? "Неизвестный"}</span>
                      <div className="w-24 bg-gray-100 rounded-full h-2 hidden sm:block">
                        <div
                          className="bg-indigo-500 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-28 text-right">{amount.toLocaleString("ru-RU")} ₽</span>
                      <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Project breakdown */}
        {projectExpenseStats.size > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <button
              onClick={() => setProjectBreakdownOpen((v) => !v)}
              className="w-full flex items-center justify-between p-5 text-left"
            >
              <h2 className="text-sm font-bold text-gray-700">Расходы по проектам</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">
                  {Array.from(projectExpenseStats.values()).reduce((a, b) => a + b, 0).toLocaleString("ru-RU")} ₽
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-4 w-4 text-gray-400 transition-transform ${projectBreakdownOpen ? "rotate-180" : ""}`}
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
                      <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{project?.name ?? "Неизвестный"}</span>
                      <div className="w-24 bg-gray-100 rounded-full h-2 hidden sm:block">
                        <div
                          className="bg-indigo-500 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-28 text-right">{amount.toLocaleString("ru-RU")} ₽</span>
                      <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* New expense button */}
        <div className="flex items-center justify-end mb-4">
          <button
            onClick={() => setEditing("create")}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            + Новый расход
          </button>
        </div>

        {/* Table */}
        <ExpenseTable
          expenses={expenses}
          projects={projects}
          channels={channels}
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
