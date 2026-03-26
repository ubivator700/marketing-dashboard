"use client";

import { useState } from "react";
import type { Project } from "@/types/dashboard";
import { useAppContext } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import ModalShell from "@/components/dashboard/modal-shell";

interface ProjectEditModalProps {
  project: Project | null;
  onSave: (project: Project) => void;
  onDelete?: (projectId: number) => void;
  onClose: () => void;
}

export default function ProjectEditModal({
  project,
  onSave,
  onDelete,
  onClose,
}: ProjectEditModalProps) {
  const { employees } = useAppContext();
  const { user } = useAuth();
  const isCreate = project === null;
  const isAdmin = user?.role === "admin";
  const [name, setName] = useState(project?.name ?? "");
  const [goal, setGoal] = useState(project?.goal ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [startDate, setStartDate] = useState(project?.startDate ?? "");
  const [deadline, setDeadline] = useState(project?.deadline ?? "");
  const [responsible, setResponsible] = useState(project?.responsible ?? "");
  const [cancelled, setCancelled] = useState(project?.cancelled ?? false);
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!name.trim()) { setError("Введите название проекта"); return; }
    if (!deadline) { setError("Укажите дедлайн"); return; }
    onSave({
      id: project?.id ?? Date.now(),
      name: name.trim(),
      goal: goal.trim(),
      description: description.trim(),
      startDate: startDate || undefined,
      deadline,
      priority: project?.priority ?? Date.now(),
      responsible: responsible || undefined,
      planItemId: project?.planItemId ?? null,
      cancelled,
      stages: project?.stages ?? [],
    });
  };

  const handleDelete = () => {
    if (project && onDelete && window.confirm("Удалить проект? Связанные расходы будут откреплены.")) {
      onDelete(project.id);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const selectClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <ModalShell onClose={onClose} title={isCreate ? "Новый проект" : "Редактировать проект"}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Название</label>
          <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Название проекта..." className={inputClass} autoFocus />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Цель</label>
          <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Цель проекта..." className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Описание</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание проекта..." className={`${inputClass} resize-none`} rows={3} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Дата начала</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Дедлайн</label>
            <input type="date" value={deadline} onChange={(e) => { setDeadline(e.target.value); setError(""); }} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Ответственный</label>
            <select value={responsible} onChange={(e) => setResponsible(e.target.value)} className={selectClass}>
              <option value="">Не назначен</option>
              {employees.map((emp) => (
                <option key={emp.name} value={emp.name}>{emp.name}</option>
              ))}
            </select>
          </div>
        </div>
        {/* Cancelled toggle — admin only, edit only */}
        {!isCreate && isAdmin && (
          <div className="mt-3 flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={cancelled}
                onChange={(e) => setCancelled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500" />
            </label>
            <span className="text-xs font-medium text-gray-600">Проект отменён</span>
          </div>
        )}
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
