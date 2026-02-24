"use client";

import { useState, useMemo } from "react";
import type { StandaloneTask, StandaloneTaskStatus, Channel } from "@/types/dashboard";
import { projectTaskStatusLabels, projectTaskStatusColors } from "@/lib/projects-data";
import { teamMembers } from "@/lib/data";
import ModalShell from "@/components/dashboard/modal-shell";

interface StandaloneTasksTabProps {
  tasks: StandaloneTask[];
  channels: Channel[];
  onSave: (task: StandaloneTask) => void;
  onDelete: (taskId: number) => void;
}

const statusOptions: StandaloneTaskStatus[] = ["todo", "in_progress", "done"];

type SortField = "status" | "name" | "assignee" | "channel" | "deadline";
type SortDir = "asc" | "desc";

const statusOrder: Record<StandaloneTaskStatus, number> = { in_progress: 0, todo: 1, done: 2 };

export default function StandaloneTasksTab({
  tasks,
  channels,
  onSave,
  onDelete,
}: StandaloneTasksTabProps) {
  const [editingTask, setEditingTask] = useState<StandaloneTask | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sortField, setSortField] = useState<SortField>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const channelName = (channelId: number | null) => {
    if (channelId === null) return "—";
    return channels.find((c) => c.id === channelId)?.name ?? "—";
  };

  const sorted = useMemo(() => {
    const arr = [...tasks];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "status":
          cmp = statusOrder[a.status] - statusOrder[b.status];
          break;
        case "name":
          cmp = a.name.localeCompare(b.name, "ru");
          break;
        case "assignee":
          cmp = a.assignee.localeCompare(b.assignee, "ru");
          break;
        case "channel":
          cmp = channelName(a.channelId).localeCompare(channelName(b.channelId), "ru");
          break;
        case "deadline":
          cmp = a.deadline.localeCompare(b.deadline);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [tasks, sortField, sortDir, channels]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "deadline" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-300 text-[10px]">⇅</span>;
    }
    return <span className="ml-1 text-indigo-500 text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>;
  };

  const counts = useMemo(
    () => ({
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      done: tasks.filter((t) => t.status === "done").length,
    }),
    [tasks],
  );

  const handleModalSave = (task: StandaloneTask) => {
    onSave(task);
    setEditingTask(null);
    setShowCreateModal(false);
  };

  const handleModalDelete = (taskId: number) => {
    onDelete(taskId);
    setEditingTask(null);
  };

  const thClass = "text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none transition-colors";

  return (
    <div>
      {/* Header with button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Текущие задачи</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Новая задача
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Всего задач</p>
          <p className="text-xl font-black text-gray-900">{counts.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">К выполнению</p>
          <p className="text-xl font-black text-gray-500">{counts.todo}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">В работе</p>
          <p className="text-xl font-black text-blue-600">{counts.in_progress}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Готово</p>
          <p className="text-xl font-black text-green-600">{counts.done}</p>
        </div>
      </div>

      {/* Tasks table */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <p>Нет задач</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left border-b border-gray-100">
                  <th className={`${thClass} w-12`} onClick={() => handleSort("status")}>
                    <SortIcon field="status" />
                  </th>
                  <th className={thClass} onClick={() => handleSort("name")}>
                    Задача <SortIcon field="name" />
                  </th>
                  <th className={thClass} onClick={() => handleSort("assignee")}>
                    Исполнитель <SortIcon field="assignee" />
                  </th>
                  <th className={thClass} onClick={() => handleSort("channel")}>
                    Канал <SortIcon field="channel" />
                  </th>
                  <th className={thClass} onClick={() => handleSort("deadline")}>
                    Дедлайн <SortIcon field="deadline" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((task) => (
                  <tr
                    key={task.id}
                    className={`hover:bg-gray-50 transition-colors ${task.status === "done" ? "opacity-60" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSave({ ...task, status: task.status === "done" ? "todo" : "done" });
                        }}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          task.status === "done"
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-gray-300 hover:border-green-400"
                        }`}
                        title={task.status === "done" ? "Вернуть в работу" : "Отметить как готово"}
                      >
                        {task.status === "done" && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </td>
                    <td
                      className={`px-4 py-3 font-medium text-gray-900 max-w-[250px] cursor-pointer ${task.status === "done" ? "line-through text-gray-400" : ""}`}
                      onClick={() => setEditingTask(task)}
                    >
                      {task.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500 cursor-pointer" onClick={() => setEditingTask(task)}>{task.assignee}</td>
                    <td className="px-4 py-3 text-gray-500 cursor-pointer" onClick={() => setEditingTask(task)}>{channelName(task.channelId)}</td>
                    <td className="px-4 py-3 text-gray-400 cursor-pointer" onClick={() => setEditingTask(task)}>
                      {new Date(task.deadline + "T00:00:00").toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingTask && (
        <StandaloneTaskModal
          task={editingTask}
          channels={channels}
          onSave={handleModalSave}
          onDelete={handleModalDelete}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* Create modal */}
      {showCreateModal && (
        <StandaloneTaskModal
          task={null}
          channels={channels}
          onSave={handleModalSave}
          onDelete={() => {}}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modal for creating / editing a standalone task                     */
/* ------------------------------------------------------------------ */

interface StandaloneTaskModalProps {
  task: StandaloneTask | null;
  channels: Channel[];
  onSave: (task: StandaloneTask) => void;
  onDelete: (taskId: number) => void;
  onClose: () => void;
}

function StandaloneTaskModal({
  task,
  channels,
  onSave,
  onDelete,
  onClose,
}: StandaloneTaskModalProps) {
  const isCreate = task === null;
  const [name, setName] = useState(task?.name ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [assignee, setAssignee] = useState(task?.assignee ?? teamMembers[0]?.name ?? "");
  const [status, setStatus] = useState<StandaloneTaskStatus>(task?.status ?? "todo");
  const [deadline, setDeadline] = useState(task?.deadline ?? "");
  const [dueTime, setDueTime] = useState(task?.dueTime ?? "");
  const [duration, setDuration] = useState<number | "">(task?.duration ?? "");
  const [channelId, setChannelId] = useState<number | null>(task?.channelId ?? null);
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!name.trim()) {
      setError("Введите название задачи");
      return;
    }
    if (!deadline) {
      setError("Укажите дедлайн");
      return;
    }
    onSave({
      id: task?.id ?? Date.now(),
      name: name.trim(),
      description: description.trim(),
      assignee,
      deadline,
      dueTime: dueTime || undefined,
      duration: duration === "" ? undefined : duration,
      status,
      channelId,
    });
  };

  const handleDelete = () => {
    if (task && window.confirm("Удалить задачу?")) {
      onDelete(task.id);
    }
  };

  const inputClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const selectClass =
    "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <ModalShell onClose={onClose} title={isCreate ? "Новая задача" : "Редактировать задачу"}>
      <div className="space-y-3">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Задача</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="Название задачи..."
            className={inputClass}
            autoFocus
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание задачи..."
            className={`${inputClass} resize-none`}
            rows={2}
          />
        </div>

        {/* Assignee + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Исполнитель</label>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={selectClass}>
              {teamMembers.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Статус</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StandaloneTaskStatus)}
              className={selectClass}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {projectTaskStatusLabels[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Deadline + Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Дедлайн</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => {
                setDeadline(e.target.value);
                setError("");
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Время</label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Duration + Channel */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Длительность (мин)
            </label>
            <input
              type="number"
              min={0}
              value={duration}
              onChange={(e) => setDuration(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Канал</label>
            <select
              value={channelId ?? ""}
              onChange={(e) => setChannelId(e.target.value ? Number(e.target.value) : null)}
              className={selectClass}
            >
              <option value="">Без канала</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-6">
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {isCreate ? "Создать" : "Сохранить"}
        </button>
        {!isCreate && (
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
