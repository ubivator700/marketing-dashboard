"use client";

import { useState } from "react";
import type { Stage } from "@/types/dashboard";
import ModalShell from "@/components/dashboard/modal-shell";

interface StageEditModalProps {
  stage: Stage | null;
  projectId: number;
  projectName: string;
  onSave: (stage: Stage) => void;
  onDelete?: (stageId: number) => void;
  onClose: () => void;
}

export default function StageEditModal({
  stage,
  projectId,
  projectName,
  onSave,
  onDelete,
  onClose,
}: StageEditModalProps) {
  const isCreate = stage === null;
  const [name, setName] = useState(stage?.name ?? "");
  const [result, setResult] = useState(stage?.result ?? "");
  const [description, setDescription] = useState(stage?.description ?? "");
  const [deadline, setDeadline] = useState(stage?.deadline ?? "");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!name.trim()) { setError("Введите название этапа"); return; }
    if (!deadline) { setError("Укажите дедлайн"); return; }
    onSave({
      id: stage?.id ?? Date.now(),
      name: name.trim(),
      result: result.trim(),
      description: description.trim(),
      deadline,
      projectId,
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
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Дедлайн</label>
          <input type="date" value={deadline} onChange={(e) => { setDeadline(e.target.value); setError(""); }} className={inputClass} />
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
