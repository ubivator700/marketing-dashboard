"use client";

import { useState } from "react";
import type { StandaloneTask } from "@/types/dashboard";

interface ChannelTaskListProps {
  channelId: number;
  tasks: StandaloneTask[];
  employees: string[];
  onAdd: (task: StandaloneTask) => void;
  onToggle: (taskId: number) => void;
  onDelete: (taskId: number) => void;
}

const STATUS_LABELS: Record<string, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  done: "Готово",
};

export default function ChannelTaskList({
  channelId,
  tasks,
  employees,
  onAdd,
  onToggle,
  onDelete,
}: ChannelTaskListProps) {
  const [newText, setNewText] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newAssignee, setNewAssignee] = useState(employees[0] ?? "");

  const channelTasks = tasks.filter((t) => t.channelId === channelId);

  const handleAdd = () => {
    if (!newText.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    onAdd({
      id: Date.now(),
      name: newText.trim(),
      description: "",
      assignee: newAssignee,
      deadline: newDeadline || today,
      status: "todo",
      channelId,
    });
    setNewText("");
    setNewDeadline("");
  };

  return (
    <div className="space-y-1">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        Задачи ({channelTasks.length})
      </h4>
      {channelTasks.length === 0 && (
        <p className="text-xs text-gray-400 py-1">Нет задач</p>
      )}
      {channelTasks.map((task) => (
        <div key={task.id} className="flex items-center gap-2 py-1.5 group">
          <button
            onClick={() => onToggle(task.id)}
            className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              task.status === "done"
                ? "bg-green-500 border-green-500"
                : "border-gray-300 hover:border-indigo-400"
            }`}
          >
            {task.status === "done" && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <span className={`text-sm ${task.status === "done" ? "line-through text-gray-400" : "text-gray-700"}`}>
              {task.name}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              {task.assignee && (
                <span className="text-[10px] text-gray-400">{task.assignee}</span>
              )}
              {task.status !== "done" && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  task.status === "in_progress" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"
                }`}>
                  {STATUS_LABELS[task.status]}
                </span>
              )}
            </div>
          </div>
          {task.deadline && (
            <span className="text-xs text-gray-400 shrink-0">
              {new Date(task.deadline + "T00:00:00").toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
          <button
            onClick={() => onDelete(task.id)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs transition-opacity shrink-0"
          >
            ✕
          </button>
        </div>
      ))}

      {/* Add new task inline */}
      <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Новая задача..."
            className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={handleAdd}
            disabled={!newText.trim()}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {employees.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <input
            type="date"
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}
