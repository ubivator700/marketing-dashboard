"use client";

import { useState } from "react";
import type { Plan } from "@/types/dashboard";
import ModalShell from "@/components/dashboard/modal-shell";

interface PlanEditModalProps {
  plan: Plan | null; // null = create new
  onSave: (plan: Plan) => void;
  onDelete?: (planId: number) => void;
  onClose: () => void;
}

export default function PlanEditModal({ plan, onSave, onDelete, onClose }: PlanEditModalProps) {
  const isNew = !plan;
  const [name, setName] = useState(plan?.name ?? "");
  const [startDate, setStartDate] = useState(plan?.startDate ?? "");
  const [deadline, setDeadline] = useState(plan?.deadline ?? new Date().toISOString().slice(0, 10));

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      id: plan?.id ?? Date.now(),
      name: name.trim(),
      startDate: startDate || undefined,
      deadline,
      sortOrder: plan?.sortOrder ?? 0,
      items: plan?.items ?? [],
    });
  };

  return (
    <ModalShell onClose={onClose} title={isNew ? "Новый план" : "Редактировать план"}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            placeholder="Название плана"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
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
        </div>

        <div className="flex items-center justify-between pt-2">
          {onDelete && plan ? (
            <button
              onClick={() => {
                if (window.confirm("Удалить план? Все пункты будут удалены, проекты откреплены."))
                  onDelete(plan.id);
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
