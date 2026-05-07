"use client";

import { useEffect, useState, useCallback } from "react";
import type { ExpenseRequest, Project, Channel, Store, Expense } from "@/types/dashboard";

interface Props {
  isAdmin: boolean;
  projects: Project[];
  channels: Channel[];
  stores: Store[];
  /** При admin-approve — добавить новую запись в expenses (через приходящий из API expenseId) */
  onExpenseCreated?: (expense: Expense) => void;
  /** Триггер обновления извне (после POST новой заявки) */
  reloadKey?: number;
}

/**
 * Блок заявок на расход.
 * - admin: видит все pending + кнопки одобрить/отклонить
 * - employee: видит свои заявки (любого статуса) read-only
 */
export default function ExpenseRequestsBlock({ isAdmin, projects, channels, stores, onExpenseCreated, reloadKey }: Props) {
  const [requests, setRequests] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/expense-requests");
      if (res.ok) setRequests(await res.json());
    } catch (err) {
      console.error("[expense-requests] load", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload, reloadKey]);

  const decide = async (id: number, status: "approved" | "rejected") => {
    const res = await fetch(`/api/expense-requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated: ExpenseRequest = await res.json();
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      if (status === "approved" && updated.expenseId && onExpenseCreated) {
        onExpenseCreated({
          id: updated.expenseId,
          name: updated.name,
          amount: updated.amount,
          responsible: updated.responsible,
          date: updated.date,
          projectId: updated.projectId,
          channelId: updated.channelId,
          storeId: updated.storeId,
        });
      }
    } else {
      alert("Ошибка решения по заявке");
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Удалить заявку?")) return;
    const res = await fetch(`/api/expense-requests/${id}`, { method: "DELETE" });
    if (res.ok) setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending").slice(0, 20);

  if (loading) return null;
  if (requests.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">
          Заявки на расход
          {pending.length > 0 && (
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {pending.length} ждёт одобрения
            </span>
          )}
        </h2>
        <svg className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-2">
          {pending.map((r) => (
            <RequestRow
              key={r.id}
              req={r}
              isAdmin={isAdmin}
              projects={projects}
              channels={channels}
              stores={stores}
              onApprove={() => decide(r.id, "approved")}
              onReject={() => decide(r.id, "rejected")}
              onDelete={() => remove(r.id)}
            />
          ))}
          {decided.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">История решений ({decided.length})</summary>
              <div className="mt-2 space-y-1">
                {decided.map((r) => (
                  <RequestRow
                    key={r.id}
                    req={r}
                    isAdmin={isAdmin}
                    projects={projects}
                    channels={channels}
                    stores={stores}
                    readonly
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function RequestRow({
  req,
  isAdmin,
  projects,
  channels,
  stores,
  onApprove,
  onReject,
  onDelete,
  readonly,
}: {
  req: ExpenseRequest;
  isAdmin: boolean;
  projects: Project[];
  channels: Channel[];
  stores: Store[];
  onApprove?: () => void;
  onReject?: () => void;
  onDelete?: () => void;
  readonly?: boolean;
}) {
  const project = req.projectId ? projects.find((p) => p.id === req.projectId)?.name : null;
  const channel = req.channelId ? channels.find((c) => c.id === req.channelId)?.name : null;
  const store = req.storeId ? stores.find((s) => s.id === req.storeId)?.name : null;

  const statusBadge =
    req.status === "approved" ? "bg-green-100 text-green-700"
    : req.status === "rejected" ? "bg-red-100 text-red-700"
    : "bg-amber-100 text-amber-700";
  const statusLabel = req.status === "approved" ? "Одобрено" : req.status === "rejected" ? "Отклонено" : "Ожидает";

  return (
    <div className="flex items-start gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-700/40 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{req.name}</span>
          <span className="text-sm font-bold text-indigo-600">{req.amount.toLocaleString("ru-RU")} ₽</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusBadge}`}>{statusLabel}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 flex-wrap">
          <span>👤 {req.responsible}</span>
          <span>📅 {new Date(req.date + "T00:00:00").toLocaleDateString("ru-RU")}</span>
          {project && <span>📁 {project}</span>}
          {channel && <span>📡 {channel}</span>}
          {store && <span>🏪 {store}</span>}
        </div>
        {req.comment && <p className="text-[11px] text-gray-500 mt-1">💬 {req.comment}</p>}
      </div>
      {!readonly && isAdmin && req.status === "pending" && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={onApprove} className="px-2.5 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">Одобрить</button>
          <button onClick={onReject} className="px-2.5 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200">Отклонить</button>
        </div>
      )}
      {!readonly && !isAdmin && req.status === "pending" && onDelete && (
        <button onClick={onDelete} className="text-gray-400 hover:text-red-500 text-sm">🗑</button>
      )}
    </div>
  );
}
