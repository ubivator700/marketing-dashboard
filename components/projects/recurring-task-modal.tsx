"use client";

import { useState, useEffect } from "react";
import type { RecurringTask, RecurrenceType, RecurringTaskStatus, Channel, Employee } from "@/types/dashboard";
import ModalShell from "@/components/dashboard/modal-shell";

interface RecurringTaskModalProps {
  task: RecurringTask | null; // null = new
  channels: Channel[];
  employees: Employee[];
  onSave: (task: RecurringTask) => void;
  onDelete?: (taskId: number) => void;
  onClose: () => void;
}

const RECURRENCE_TYPE_LABELS: Record<RecurrenceType, string> = {
  daily: "Ежедневно",
  weekly: "Еженедельно",
  monthly: "Ежемесячно",
};

const DAY_OF_WEEK_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function RecurringTaskModal({
  task,
  channels,
  employees,
  onSave,
  onDelete,
  onClose,
}: RecurringTaskModalProps) {
  const [name, setName] = useState(task?.name ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [assignee, setAssignee] = useState(task?.assignee ?? (employees[0]?.name ?? ""));
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(task?.recurrenceType ?? "weekly");
  const [recurrenceInterval, setRecurrenceInterval] = useState(task?.recurrenceInterval ?? 1);
  const [weekDays, setWeekDays] = useState<number[]>(() => {
    if (task?.recurrenceType === "weekly" && task.recurrenceDays) {
      return task.recurrenceDays.split(",").map(Number);
    }
    return [0, 2, 4]; // Mon, Wed, Fri by default
  });
  const [monthDays, setMonthDays] = useState(
    task?.recurrenceType === "monthly" && task.recurrenceDays ? task.recurrenceDays : "1"
  );
  const [channelId, setChannelId] = useState<number | null>(task?.channelId ?? null);
  const [dueTime, setDueTime] = useState(task?.dueTime ?? "");
  const [duration, setDuration] = useState(String(task?.duration ?? ""));
  const [status, setStatus] = useState<RecurringTaskStatus>(task?.status ?? "active");

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description);
      setAssignee(task.assignee);
      setRecurrenceType(task.recurrenceType);
      setRecurrenceInterval(task.recurrenceInterval);
      if (task.recurrenceType === "weekly" && task.recurrenceDays) {
        setWeekDays(task.recurrenceDays.split(",").map(Number));
      }
      if (task.recurrenceType === "monthly" && task.recurrenceDays) {
        setMonthDays(task.recurrenceDays);
      }
      setChannelId(task.channelId);
      setDueTime(task.dueTime ?? "");
      setDuration(String(task.duration ?? ""));
      setStatus(task.status);
    }
  }, [task]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    let recurrenceDays = "";
    if (recurrenceType === "weekly") {
      recurrenceDays = weekDays.sort((a, b) => a - b).join(",");
    } else if (recurrenceType === "monthly") {
      recurrenceDays = monthDays;
    }

    const saved: RecurringTask = {
      id: task?.id ?? Date.now(),
      name: name.trim(),
      description: description.trim(),
      assignee,
      recurrenceType,
      recurrenceInterval: Math.max(1, recurrenceInterval),
      recurrenceDays,
      channelId,
      dueTime: dueTime || undefined,
      duration: duration ? Number(duration) : undefined,
      status,
    };
    onSave(saved);
  };

  const toggleWeekDay = (day: number) => {
    setWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <ModalShell
      onClose={onClose}
      title={task ? "Редактировать регулярную задачу" : "Новая регулярная задача"}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Название задачи"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Описание задачи"
          />
        </div>

        {/* Assignee */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Исполнитель</label>
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {employees.map((emp) => (
              <option key={emp.name} value={emp.name}>{emp.name}</option>
            ))}
          </select>
        </div>

        {/* Recurrence Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Тип повторения</label>
          <div className="flex gap-2">
            {(Object.keys(RECURRENCE_TYPE_LABELS) as RecurrenceType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setRecurrenceType(type)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  recurrenceType === type
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {RECURRENCE_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Interval */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Каждые N {recurrenceType === "daily" ? "дней" : recurrenceType === "weekly" ? "недель" : "месяцев"}
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={recurrenceInterval}
            onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value)))}
            className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Weekly: day selector */}
        {recurrenceType === "weekly" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дни недели</label>
            <div className="flex gap-1.5">
              {DAY_OF_WEEK_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleWeekDay(i)}
                  className={`w-10 h-10 rounded-lg text-xs font-bold transition-colors ${
                    weekDays.includes(i)
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Monthly: day of month */}
        {recurrenceType === "monthly" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Числа месяца (через запятую, напр. 1,15)
            </label>
            <input
              type="text"
              value={monthDays}
              onChange={(e) => setMonthDays(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="1,15"
            />
          </div>
        )}

        {/* Time & Duration */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Время начала</label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Длительность (мин)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min={0}
              step={15}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="60"
            />
          </div>
        </div>

        {/* Channel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Канал (опционально)</label>
          <select
            value={channelId ?? ""}
            onChange={(e) => setChannelId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Без канала</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>{ch.name}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        {task && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus("active")}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  status === "active"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Активна
              </button>
              <button
                type="button"
                onClick={() => setStatus("paused")}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  status === "paused"
                    ? "bg-yellow-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Приостановлена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-6">
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {task ? "Сохранить" : "Создать"}
        </button>
        {task && onDelete && (
          <button
            onClick={() => {
              if (window.confirm("Удалить регулярную задачу?")) onDelete(task.id);
            }}
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
