"use client";

import { useState, useRef, useEffect } from "react";
import type { StandaloneTask, Channel } from "@/types/dashboard";
import type { AuthUser } from "@/lib/auth-context";
import { teamMembers } from "@/lib/data";
import ModalShell from "@/components/dashboard/modal-shell";

interface CalendarQuickAddModalProps {
  defaultDate: string; // "YYYY-MM-DD"
  defaultTime?: string; // "HH:MM"
  channels: Channel[];
  currentUser: AuthUser | null;
  onSave: (task: StandaloneTask) => void;
  onClose: () => void;
}

export default function CalendarQuickAddModal({
  defaultDate,
  defaultTime,
  channels,
  currentUser,
  onSave,
  onClose,
}: CalendarQuickAddModalProps) {
  const [name, setName] = useState("");
  const [assignee, setAssignee] = useState(currentUser?.employeeName ?? teamMembers[0]?.name ?? "");
  const [deadline, setDeadline] = useState(defaultDate);
  const [dueTime, setDueTime] = useState(defaultTime ?? "");
  const [duration, setDuration] = useState("60");
  const [channelId, setChannelId] = useState<number | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (!name.trim()) return;

    const task: StandaloneTask = {
      id: Date.now(),
      name: name.trim(),
      description: "",
      assignee,
      deadline,
      dueTime: dueTime || undefined,
      duration: dueTime && duration ? parseInt(duration, 10) : undefined,
      status: "todo",
      channelId,
    };
    onSave(task);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const dateLabel = new Date(deadline + "T00:00:00").toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });

  return (
    <ModalShell title="Новая задача" onClose={onClose}>
      <div className="space-y-3">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Название
          </label>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Что нужно сделать?"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Assignee + Deadline row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Исполнитель
            </label>
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {teamMembers.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Дата — {dateLabel}
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        {/* Time + Duration row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Время
            </label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Длительность (мин)
            </label>
            <input
              type="number"
              min="15"
              step="15"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        {/* Channel */}
        {channels.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Канал
            </label>
            <select
              value={channelId ?? ""}
              onChange={(e) =>
                setChannelId(e.target.value ? Number(e.target.value) : null)
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Без канала</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 bg-indigo-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Создать
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
