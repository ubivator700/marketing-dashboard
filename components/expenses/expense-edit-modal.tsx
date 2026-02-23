"use client";

import { useState } from "react";
import type { Expense } from "@/types/dashboard";
import { teamMembers } from "@/lib/data";
import { useAppContext } from "@/lib/app-context";
import ModalShell from "@/components/dashboard/modal-shell";

interface ExpenseEditModalProps {
  expense: Expense | null;
  onSave: (expense: Expense) => void;
  onDelete?: (expenseId: number) => void;
  onClose: () => void;
}

export default function ExpenseEditModal({
  expense,
  onSave,
  onDelete,
  onClose,
}: ExpenseEditModalProps) {
  const { projects, channels } = useAppContext();
  const isCreate = expense === null;

  const [name, setName] = useState(expense?.name ?? "");
  const [amount, setAmount] = useState(expense?.amount ?? 0);
  const [responsible, setResponsible] = useState(expense?.responsible ?? teamMembers[0]?.name ?? "");
  const [projectId, setProjectId] = useState<number | null>(expense?.projectId ?? null);
  const [date, setDate] = useState(expense?.date ?? new Date().toISOString().slice(0, 10));
  const [channelId, setChannelId] = useState<number | null>(expense?.channelId ?? null);
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!name.trim()) { setError("Введите название расхода"); return; }
    if (amount <= 0) { setError("Укажите сумму"); return; }
    onSave({
      id: expense?.id ?? Date.now(),
      name: name.trim(),
      amount,
      responsible,
      date,
      projectId,
      channelId,
    });
  };

  const handleDelete = () => {
    if (expense && onDelete && window.confirm("Удалить расход?")) {
      onDelete(expense.id);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const selectClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <ModalShell onClose={onClose} title={isCreate ? "Новый расход" : "Редактировать расход"}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Название</label>
          <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Название расхода..." className={inputClass} autoFocus />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Сумма (₽)</label>
            <input type="number" min={0} step={100} value={amount} onChange={(e) => { setAmount(Number(e.target.value)); setError(""); }} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Дата</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ответственный</label>
            <select value={responsible} onChange={(e) => setResponsible(e.target.value)} className={selectClass}>
              {teamMembers.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Проект</label>
          <select
            value={projectId ?? ""}
            onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
            className={selectClass}
          >
            <option value="">Без проекта</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Рекламный канал</label>
          <select
            value={channelId ?? ""}
            onChange={(e) => setChannelId(e.target.value ? Number(e.target.value) : null)}
            className={selectClass}
          >
            <option value="">Без канала</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-6">
        <button onClick={handleSave} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          {isCreate ? "Создать" : "Сохранить"}
        </button>
        {!isCreate && onDelete && (
          <button onClick={handleDelete} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
            Удалить
          </button>
        )}
        <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
          Отмена
        </button>
      </div>
    </ModalShell>
  );
}
