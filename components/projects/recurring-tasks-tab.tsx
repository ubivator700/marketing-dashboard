"use client";

import { useState, useCallback } from "react";
import type { RecurringTask, Channel, Employee } from "@/types/dashboard";
import RecurringTaskModal from "./recurring-task-modal";

interface RecurringTasksTabProps {
  tasks: RecurringTask[];
  channels: Channel[];
  employees: Employee[];
  onSave: (task: RecurringTask) => void;
  onDelete: (taskId: number) => void;
}

const RECURRENCE_TYPE_LABELS: Record<string, string> = {
  daily: "Ежедневно",
  weekly: "Еженедельно",
  monthly: "Ежемесячно",
};

const DAY_OF_WEEK_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function recurrenceDescription(task: RecurringTask): string {
  const interval = task.recurrenceInterval;
  switch (task.recurrenceType) {
    case "daily":
      return interval === 1 ? "Каждый день" : `Каждые ${interval} дней`;
    case "weekly": {
      const days = task.recurrenceDays
        ? task.recurrenceDays.split(",").map(Number).map((d) => DAY_OF_WEEK_SHORT[d]).join(", ")
        : "";
      const prefix = interval === 1 ? "Каждую неделю" : `Каждые ${interval} нед.`;
      return `${prefix}: ${days}`;
    }
    case "monthly": {
      const days = task.recurrenceDays || "";
      const prefix = interval === 1 ? "Каждый месяц" : `Каждые ${interval} мес.`;
      return `${prefix}, ${days}-е числа`;
    }
    default:
      return "";
  }
}

export default function RecurringTasksTab({
  tasks,
  channels,
  employees,
  onSave,
  onDelete,
}: RecurringTasksTabProps) {
  const [modalTask, setModalTask] = useState<{ task: RecurringTask | null } | null>(null);

  const channelNameMap = new Map(channels.map((ch) => [ch.id, ch.name]));

  const handleSave = useCallback(
    (task: RecurringTask) => {
      onSave(task);
      setModalTask(null);
    },
    [onSave]
  );

  const handleDelete = useCallback(
    (taskId: number) => {
      onDelete(taskId);
      setModalTask(null);
    },
    [onDelete]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {tasks.length} регулярн{tasks.length === 1 ? "ая задача" : tasks.length < 5 ? "ые задачи" : "ых задач"}
        </p>
        <button
          onClick={() => setModalTask({ task: null })}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          + Новая регулярная задача
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🔄</div>
          <p className="text-lg">Нет регулярных задач</p>
          <p className="text-sm mt-1">Создайте первую, нажав кнопку выше</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setModalTask({ task })}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-gray-900 truncate">
                      {task.name}
                    </h4>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        task.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {task.status === "active" ? "Активна" : "Пауза"}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
                  )}

                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
                    {/* Recurrence badge */}
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {recurrenceDescription(task)}
                    </span>

                    {/* Type badge */}
                    <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                      {RECURRENCE_TYPE_LABELS[task.recurrenceType]}
                    </span>

                    {/* Assignee */}
                    {task.assignee && (
                      <span className="text-xs text-gray-500">{task.assignee}</span>
                    )}

                    {/* Time */}
                    {task.dueTime && (
                      <span className="text-xs text-gray-400">
                        {task.dueTime}
                        {task.duration ? ` (${task.duration} мин)` : ""}
                      </span>
                    )}

                    {/* Channel */}
                    {task.channelId && (
                      <span className="text-xs text-indigo-500">
                        {channelNameMap.get(task.channelId) ?? ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit arrow */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 mt-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalTask !== null && (
        <RecurringTaskModal
          task={modalTask.task}
          channels={channels}
          employees={employees}
          onSave={handleSave}
          onDelete={modalTask.task ? handleDelete : undefined}
          onClose={() => setModalTask(null)}
        />
      )}
    </div>
  );
}
