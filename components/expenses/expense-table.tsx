"use client";

import { useState, useMemo } from "react";
import type { Expense, Project, Channel } from "@/types/dashboard";

interface ExpenseTableProps {
  expenses: Expense[];
  projects: Project[];
  channels: Channel[];
  total: number;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: number) => void;
}

type SortField = "date" | "name" | "amount" | "responsible" | "project" | "channel";
type SortDir = "asc" | "desc";

function formatAmount(amount: number): string {
  return amount.toLocaleString("ru-RU") + " ₽";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ExpenseTable({
  expenses,
  projects,
  channels,
  total,
  onEdit,
  onDelete,
}: ExpenseTableProps) {
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const projectName = (projectId: number | null): string => {
    if (projectId === null) return "—";
    return projects.find((p) => p.id === projectId)?.name ?? "—";
  };

  const channelName = (channelId: number | null | undefined): string => {
    if (channelId === null || channelId === undefined) return "—";
    return channels.find((c) => c.id === channelId)?.name ?? "—";
  };

  const sorted = useMemo(() => {
    const arr = [...expenses];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":
          cmp = a.date.localeCompare(b.date);
          break;
        case "name":
          cmp = a.name.localeCompare(b.name, "ru");
          break;
        case "amount":
          cmp = a.amount - b.amount;
          break;
        case "responsible":
          cmp = a.responsible.localeCompare(b.responsible, "ru");
          break;
        case "project":
          cmp = projectName(a.projectId).localeCompare(projectName(b.projectId), "ru");
          break;
        case "channel":
          cmp = channelName(a.channelId).localeCompare(channelName(b.channelId), "ru");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [expenses, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "amount" || field === "date" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-300 text-[10px]">⇅</span>;
    }
    return <span className="ml-1 text-indigo-500 text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>;
  };

  const thClass = "text-xs font-semibold text-gray-500 px-5 py-3 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none transition-colors";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className={`text-left ${thClass}`} onClick={() => handleSort("date")}>
                Дата <SortIcon field="date" />
              </th>
              <th className={`text-left ${thClass}`} onClick={() => handleSort("name")}>
                Название <SortIcon field="name" />
              </th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort("amount")}>
                Сумма <SortIcon field="amount" />
              </th>
              <th className={`text-left ${thClass}`} onClick={() => handleSort("responsible")}>
                Ответственный <SortIcon field="responsible" />
              </th>
              <th className={`text-left ${thClass}`} onClick={() => handleSort("project")}>
                Проект <SortIcon field="project" />
              </th>
              <th className={`text-left ${thClass}`} onClick={() => handleSort("channel")}>
                Канал <SortIcon field="channel" />
              </th>
              <th className="text-right text-xs font-semibold text-gray-500 px-5 py-3 uppercase tracking-wide w-20">Действия</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((expense) => (
              <tr
                key={expense.id}
                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group"
              >
                <td className="px-5 py-3">
                  <span className="text-sm text-gray-500">{formatDate(expense.date)}</span>
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => onEdit(expense)}
                    className="text-sm text-gray-800 hover:text-indigo-600 transition-colors text-left"
                  >
                    {expense.name}
                  </button>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-sm font-medium text-gray-900">{formatAmount(expense.amount)}</span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-sm text-gray-600">{expense.responsible}</span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-sm text-gray-500">{projectName(expense.projectId)}</span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-sm text-gray-500">{channelName(expense.channelId)}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(expense)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-600 text-sm p-1"
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Удалить расход?")) onDelete(expense.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 text-sm p-1"
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">
                  Нет расходов
                </td>
              </tr>
            )}
          </tbody>
          {expenses.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50/50 border-t border-gray-200">
                <td className="px-5 py-3" />
                <td className="px-5 py-3 text-sm font-bold text-gray-900">Итого</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-gray-900">{formatAmount(total)}</td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
