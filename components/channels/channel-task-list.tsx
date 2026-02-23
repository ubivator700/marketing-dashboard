"use client";

import { useState } from "react";
import type { ChannelTask } from "@/types/dashboard";

interface ChannelTaskListProps {
  tasks: ChannelTask[];
  onToggle: (taskId: number) => void;
  onAdd: (task: ChannelTask) => void;
  onDelete: (taskId: number) => void;
}

export default function ChannelTaskList({
  tasks,
  onToggle,
  onAdd,
  onDelete,
}: ChannelTaskListProps) {
  const [newText, setNewText] = useState("");
  const [newDeadline, setNewDeadline] = useState("");

  const handleAdd = () => {
    if (!newText.trim()) return;
    onAdd({
      id: Date.now(),
      text: newText.trim(),
      done: false,
      deadline: newDeadline || undefined,
    });
    setNewText("");
    setNewDeadline("");
  };

  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Задачи
      </h4>
      {tasks.length === 0 && (
        <p className="text-xs text-gray-400 py-1">Нет задач</p>
      )}
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-2 py-1 group"
        >
          <input
            type="checkbox"
            checked={task.done}
            onChange={() => onToggle(task.id)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span
            className={`text-sm flex-1 ${
              task.done ? "line-through text-gray-400" : "text-gray-700"
            }`}
          >
            {task.text}
          </span>
          {task.deadline && (
            <span className="text-xs text-gray-400">
              {new Date(task.deadline + "T00:00:00").toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
          <button
            onClick={() => onDelete(task.id)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs transition-opacity"
          >
            ✕
          </button>
        </div>
      ))}

      {/* Add new task inline */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Новая задача..."
          className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <input
          type="date"
          value={newDeadline}
          onChange={(e) => setNewDeadline(e.target.value)}
          className="px-2 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          onClick={handleAdd}
          disabled={!newText.trim()}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>
    </div>
  );
}
