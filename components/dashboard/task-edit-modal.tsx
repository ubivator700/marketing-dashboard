"use client";

import { useState } from "react";
import type { Task, TaskStatus, TaskPriority, DepartmentId } from "@/types/dashboard";
import { statusLabels, priorityLabels } from "@/lib/data";
import ModalShell from "./modal-shell";

interface TaskEditModalProps {
  task: Task | null;
  deptId: DepartmentId;
  deptName: string;
  deptIcon: string;
  onSave: (deptId: DepartmentId, task: Task) => void;
  onDelete?: (deptId: DepartmentId, taskId: number) => void;
  onClose: () => void;
  initialStatus?: TaskStatus;
}

const statusOptions: TaskStatus[] = ["todo", "in_progress", "done"];
const priorityOptions: TaskPriority[] = ["high", "medium", "low"];

export default function TaskEditModal({
  task,
  deptId,
  deptName,
  deptIcon,
  onSave,
  onDelete,
  onClose,
  initialStatus,
}: TaskEditModalProps) {
  const isCreate = task === null;
  const [text, setText] = useState(task?.text ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? initialStatus ?? "todo");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [dueTime, setDueTime] = useState(task?.dueTime ?? "");
  const [duration, setDuration] = useState(task?.duration ?? 60);
  const [startDate, setStartDate] = useState(task?.startDate ?? "");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!text.trim()) {
      setError("Введите текст задачи");
      return;
    }
    if (!dueDate) {
      setError("Укажите срок выполнения");
      return;
    }
    const result: Task = {
      id: task?.id ?? Date.now(),
      text: text.trim(),
      status,
      priority,
      dueDate,
      dueTime: dueTime || undefined,
      duration: duration || undefined,
      startDate: startDate || undefined,
    };
    onSave(deptId, result);
  };

  const handleDelete = () => {
    if (task && onDelete && window.confirm("Удалить задачу?")) {
      onDelete(deptId, task.id);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const selectClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <ModalShell
      onClose={onClose}
      title={isCreate ? "Новая задача" : "Редактировать задачу"}
    >
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        <span>{deptIcon}</span>
        <span>{deptName}</span>
      </div>

      <div className="space-y-3">
        {/* Task text */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Задача
          </label>
          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError("");
            }}
            placeholder="Описание задачи..."
            className={inputClass}
            autoFocus
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        {/* Status + Priority row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Статус
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className={selectClass}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Приоритет
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className={selectClass}
            >
              {priorityOptions.map((p) => (
                <option key={p} value={p}>
                  {priorityLabels[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Due date + time row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Срок
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                setError("");
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Время
            </label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Duration + start date row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Длительность (мин)
            </label>
            <input
              type="number"
              min={0}
              step={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Дата начала
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>
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
