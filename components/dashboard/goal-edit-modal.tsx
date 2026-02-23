"use client";

import { useState } from "react";
import type { Goal, DepartmentId } from "@/types/dashboard";
import ModalShell from "./modal-shell";

interface GoalEditModalProps {
  goal: Goal | null;
  deptId: DepartmentId;
  deptName: string;
  deptIcon: string;
  onSave: (deptId: DepartmentId, goal: Goal) => void;
  onDelete?: (deptId: DepartmentId, goalId: number) => void;
  onClose: () => void;
}

export default function GoalEditModal({
  goal,
  deptId,
  deptName,
  deptIcon,
  onSave,
  onDelete,
  onClose,
}: GoalEditModalProps) {
  const isCreate = goal === null;
  const [text, setText] = useState(goal?.text ?? "");
  const [progress, setProgress] = useState(goal?.progress ?? 0);
  const [kpi, setKpi] = useState(goal?.kpi ?? "");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!text.trim()) {
      setError("Введите текст цели");
      return;
    }
    onSave(deptId, {
      id: goal?.id ?? Date.now(),
      text: text.trim(),
      progress,
      kpi: kpi.trim(),
    });
  };

  const handleDelete = () => {
    if (goal && onDelete && window.confirm("Удалить цель?")) {
      onDelete(deptId, goal.id);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <ModalShell
      onClose={onClose}
      title={isCreate ? "Новая цель" : "Редактировать цель"}
    >
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        <span>{deptIcon}</span>
        <span>{deptName}</span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Цель
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError("");
            }}
            placeholder="Описание цели..."
            className={inputClass}
            autoFocus
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Прогресс — {progress}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            KPI
          </label>
          <input
            type="text"
            value={kpi}
            onChange={(e) => setKpi(e.target.value)}
            placeholder="Например: Лиды/мес"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-6">
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {isCreate ? "Создать" : "Сохранить"}
        </button>
        {!isCreate && onDelete && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            Удалить
          </button>
        )}
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Отмена
        </button>
      </div>
    </ModalShell>
  );
}
