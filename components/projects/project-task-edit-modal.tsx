"use client";

import { useState } from "react";
import type { ProjectTask, ProjectTaskStatus } from "@/types/dashboard";
import { projectTaskStatusLabels } from "@/lib/projects-data";
import { teamMembers } from "@/lib/data";
import ModalShell from "@/components/dashboard/modal-shell";

interface ProjectTaskEditModalProps {
  task: ProjectTask | null;
  projectId: number;
  stageId: number;
  stageName: string;
  onSave: (task: ProjectTask) => void;
  onDelete?: (taskId: number) => void;
  onClose: () => void;
}

const statusOptions: ProjectTaskStatus[] = ["todo", "in_progress", "done"];

function durationLabel(startDate?: string, deadline?: string): string | null {
  if (!startDate || !deadline) return null;
  const s = new Date(startDate + "T00:00:00");
  const e = new Date(deadline + "T00:00:00");
  const days = Math.round((e.getTime() - s.getTime()) / 86400000);
  if (days < 0) return null;
  const d = days + 1;
  if (d === 1) return "1 день";
  if (d >= 2 && d <= 4) return `${d} дня`;
  return `${d} дней`;
}

export default function ProjectTaskEditModal({
  task,
  projectId,
  stageId,
  stageName,
  onSave,
  onDelete,
  onClose,
}: ProjectTaskEditModalProps) {
  const isCreate = task === null;
  const [name, setName] = useState(task?.name ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [assignee, setAssignee] = useState(task?.assignee ?? teamMembers[0]?.name ?? "");
  const [startDate, setStartDate] = useState(task?.startDate ?? "");
  const [deadline, setDeadline] = useState(task?.deadline ?? "");
  const [status, setStatus] = useState<ProjectTaskStatus>(task?.status ?? "todo");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!name.trim()) { setError("Введите название задачи"); return; }
    if (!deadline) { setError("Укажите дедлайн"); return; }
    onSave({
      id: task?.id ?? Date.now(),
      name: name.trim(),
      description: description.trim(),
      assignee,
      startDate: startDate || undefined,
      deadline,
      dueTime: task?.dueTime,
      duration: task?.duration,
      status,
      stageId,
      projectId,
    });
  };

  const handleDelete = () => {
    if (task && onDelete && window.confirm("Удалить задачу?")) {
      onDelete(task.id);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const selectClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500";

  const dur = durationLabel(startDate, deadline);

  return (
    <ModalShell onClose={onClose} title={isCreate ? "Новая задача" : "Редактировать задачу"}>
      <div className="text-sm text-gray-500 mb-4">Этап: {stageName}</div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Задача</label>
          <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Название задачи..." className={inputClass} autoFocus />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Описание</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание задачи..." className={`${inputClass} resize-none`} rows={2} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Исполнитель</label>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={selectClass}>
              {teamMembers.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Статус</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ProjectTaskStatus)} className={selectClass}>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{projectTaskStatusLabels[s]}</option>
              ))}
            </select>
          </div>
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
