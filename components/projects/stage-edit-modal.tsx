"use client";

import { useState } from "react";
import type { Stage } from "@/types/dashboard";
import { useAuth } from "@/lib/auth-context";
import ModalShell from "@/components/dashboard/modal-shell";

interface StageEditModalProps {
  stage: Stage | null;
  projectId: number;
  projectName: string;
  onSave: (stage: Stage) => void;
  onDelete?: (stageId: number) => void;
  onClose: () => void;
}

function durationLabel(startDate?: string, deadline?: string): string | null {
  if (!startDate || !deadline) return null;
  const s = new Date(startDate + "T00:00:00");
  const e = new Date(deadline + "T00:00:00");
  const days = Math.round((e.getTime() - s.getTime()) / 86400000);
  if (days < 0) return null;
  if (days === 0) return "1 день";
  const d = days + 1;
  if (d === 1) return "1 день";
  if (d >= 2 && d <= 4) return `${d} дня`;
  return `${d} дней`;
}

export default function StageEditModal({
  stage,
  projectId,
  projectName,
  onSave,
  onDelete,
  onClose,
}: StageEditModalProps) {
  const { user } = useAuth();
  const isCreate = stage === null;
  const isAdmin = user?.role === "admin";
  const [name, setName] = useState(stage?.name ?? "");
  const [result, setResult] = useState(stage?.result ?? "");
  const [description, setDescription] = useState(stage?.description ?? "");
  const [startDate, setStartDate] = useState(stage?.startDate ?? "");
  const [deadline, setDeadline] = useState(stage?.deadline ?? "");
  const [cancelled, setCancelled] = useState(stage?.cancelled ?? false);
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!name.trim()) { setError("Введите название этапа"); return; }
    if (!deadline) { setError("Укажите дедлайн"); return; }
    onSave({
      id: stage?.id ?? Date.now(),
      name: name.trim(),
      result: result.trim(),
      description: description.trim(),
      startDate: startDate || undefined,
      deadline,
      projectId,
      cancelled,
      tasks: stage?.tasks ?? [],
    });
  };

  const handleDelete = () => {
    if (stage && onDelete && window.confirm("Удалить этап и все его задачи?")) {
      onDelete(stage.id);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  const dur = durationLabel(startDate, deadline);

  return (
    <ModalShell onClose={onClose} title={isCreate ? "Новый этап" : "Редактировать этап"}>
      <div className="text-sm text-gray-500 mb-4">Проект: {projectName}</div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Название</label>
          <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Название этапа..." className={inputClass} autoFocus />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ожидаемый результат</label>
          <input type="text" value={result} onChange={(e) => setResult(e.target.value)} placeholder="Что должно получиться..." className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Описание</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание этапа..." className={`${inputClass} resize-none`} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Дата начала</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Дедлайн</label>
            <input type="date" value={deadline} onChange={(e) => { setDeadline(e.target.value); setError(""); }} className={inputClass} />
          </div>
        </div>
        {dur && (
          <p className="text-xs text-gray-400">Длительность: {dur}</p>
        )}
      </div>

      {/* Cancelled toggle — admin only, edit only */}
      {!isCreate && isAdmin && (
        <div className="flex items-center gap-2 mt-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={cancelled} onChange={(e) => setCancelled(e.target.checked)} className="sr-only peer" />
            <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500" />
          </label>
          <span className="text-xs font-medium text-gray-600">Этап отменён</span>
        </div>
      )}

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
