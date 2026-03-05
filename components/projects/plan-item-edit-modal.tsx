"use client";

import { useState } from "react";
import type { PlanItem, Employee } from "@/types/dashboard";
import ModalShell from "@/components/dashboard/modal-shell";

const PLAN_ITEM_COLORS = [
  { id: "blue", label: "Синий", bg: "bg-blue-100", border: "border-blue-300", dot: "bg-blue-500" },
  { id: "rose", label: "Розовый", bg: "bg-rose-100", border: "border-rose-300", dot: "bg-rose-500" },
  { id: "emerald", label: "Зелёный", bg: "bg-emerald-100", border: "border-emerald-300", dot: "bg-emerald-500" },
  { id: "amber", label: "Жёлтый", bg: "bg-amber-100", border: "border-amber-300", dot: "bg-amber-500" },
  { id: "violet", label: "Фиолетовый", bg: "bg-violet-100", border: "border-violet-300", dot: "bg-violet-500" },
  { id: "cyan", label: "Голубой", bg: "bg-cyan-100", border: "border-cyan-300", dot: "bg-cyan-500" },
  { id: "indigo", label: "Индиго", bg: "bg-indigo-100", border: "border-indigo-300", dot: "bg-indigo-500" },
  { id: "orange", label: "Оранжевый", bg: "bg-orange-100", border: "border-orange-300", dot: "bg-orange-500" },
];

interface PlanItemEditModalProps {
  item: PlanItem | null; // null = create new
  planId: number;
  employees: Employee[];
  onSave: (item: PlanItem) => void;
  onDelete?: (itemId: number) => void;
  onClose: () => void;
}

export default function PlanItemEditModal({ item, planId, employees, onSave, onDelete, onClose }: PlanItemEditModalProps) {
  const isNew = !item;
  const [name, setName] = useState(item?.name ?? "");
  const [result, setResult] = useState(item?.result ?? "");
  const [startDate, setStartDate] = useState(item?.startDate ?? "");
  const [deadline, setDeadline] = useState(item?.deadline ?? new Date().toISOString().slice(0, 10));
  const [responsible, setResponsible] = useState(item?.responsible ?? "");
  const [color, setColor] = useState(item?.color ?? "blue");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      id: item?.id ?? Date.now(),
      name: name.trim(),
      result: result.trim(),
      startDate: startDate || undefined,
      deadline,
      responsible,
      color,
      sortOrder: item?.sortOrder ?? 0,
      planId,
    });
  };

  return (
    <ModalShell onClose={onClose} title={isNew ? "Новый пункт плана" : "Редактировать пункт"} maxWidth="max-w-lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="Название пункта"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Результат</label>
          <textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            rows={2}
            placeholder="Ожидаемый результат"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата начала</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата окончания</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ответственный</label>
            <select
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">Не назначен</option>
              {employees.map((emp) => (
                <option key={emp.name} value={emp.name}>{emp.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Цвет</label>
          <div className="flex flex-wrap gap-2">
            {PLAN_ITEM_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                  color === c.id
                    ? `${c.bg} ${c.border} ring-2 ring-offset-1 ring-gray-300`
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${c.dot}`} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {onDelete && item ? (
            <button
              onClick={() => {
                if (window.confirm("Удалить пункт плана? Проекты будут откреплены."))
                  onDelete(item.id);
              }}
              className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              Удалить
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isNew ? "Создать" : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
