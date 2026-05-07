"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdvanceRequest, ExpenseRequest } from "@/types/dashboard";

/**
 * Виджет заявок для admin-дашборда.
 * Показывает количество pending заявок на аванс и на расход + ссылки на страницы.
 */
export default function AdminApprovalsWidget() {
  const [advances, setAdvances] = useState<AdvanceRequest[]>([]);
  const [expensesReq, setExpensesReq] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, e] = await Promise.all([
          fetch("/api/advance-requests").then((r) => (r.ok ? r.json() : [])),
          fetch("/api/expense-requests").then((r) => (r.ok ? r.json() : [])),
        ]);
        if (!cancelled) {
          setAdvances(a);
          setExpensesReq(e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const pendingAdvances = advances.filter((r) => r.status === "pending");
  const pendingExpenses = expensesReq.filter((r) => r.status === "pending");

  if (loading) return null;
  if (pendingAdvances.length === 0 && pendingExpenses.length === 0) return null;

  const decideAdvance = async (id: number, status: "approved" | "rejected") => {
    const res = await fetch(`/api/advance-requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAdvances((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    }
  };

  const decideExpense = async (id: number, status: "approved" | "rejected") => {
    const res = await fetch(`/api/expense-requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setExpensesReq((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    }
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-5 mb-6">
      <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-3">
        ⚡ Ждут вашего решения
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Авансы */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Заявки на аванс ({pendingAdvances.length})
            </h3>
            <Link href="/salaries" className="text-[11px] text-indigo-600 hover:underline">
              открыть →
            </Link>
          </div>
          {pendingAdvances.length === 0 && <p className="text-xs text-gray-400">Нет pending</p>}
          <div className="space-y-1.5">
            {pendingAdvances.slice(0, 3).map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <span className="font-semibold flex-1 truncate">{r.employeeName}</span>
                <span className="font-bold text-indigo-600">{r.amount.toLocaleString("ru-RU")} ₽</span>
                <button onClick={() => decideAdvance(r.id, "approved")} className="px-1.5 py-0.5 bg-green-600 text-white rounded hover:bg-green-700">✓</button>
                <button onClick={() => decideAdvance(r.id, "rejected")} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200">✕</button>
              </div>
            ))}
            {pendingAdvances.length > 3 && (
              <p className="text-[11px] text-gray-500">…и ещё {pendingAdvances.length - 3}</p>
            )}
          </div>
        </div>

        {/* Расходы */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Заявки на расход ({pendingExpenses.length})
            </h3>
            <Link href="/expenses" className="text-[11px] text-indigo-600 hover:underline">
              открыть →
            </Link>
          </div>
          {pendingExpenses.length === 0 && <p className="text-xs text-gray-400">Нет pending</p>}
          <div className="space-y-1.5">
            {pendingExpenses.slice(0, 3).map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <span className="font-semibold flex-1 truncate" title={r.name}>{r.name}</span>
                <span className="font-bold text-indigo-600">{r.amount.toLocaleString("ru-RU")} ₽</span>
                <button onClick={() => decideExpense(r.id, "approved")} className="px-1.5 py-0.5 bg-green-600 text-white rounded hover:bg-green-700">✓</button>
                <button onClick={() => decideExpense(r.id, "rejected")} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200">✕</button>
              </div>
            ))}
            {pendingExpenses.length > 3 && (
              <p className="text-[11px] text-gray-500">…и ещё {pendingExpenses.length - 3}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
