"use client";

import { useState, useMemo } from "react";
import type {
  Project,
  Plan,
  StandaloneTask,
  StandaloneTaskStatus,
  ProjectTaskStatus,
  RecurringTask,
  Channel,
} from "@/types/dashboard";
import { projectTaskStatusLabels, projectTaskStatusColors } from "@/lib/projects-data";
import { generateInstances } from "@/lib/recurring-utils";
import ModalShell from "@/components/dashboard/modal-shell";

// ─── Unified row shown in the table ────────────────────────────────

interface TodayRow {
  key: string;
  name: string;
  assignee: string;
  dueTime?: string;
  status: string;
  statusLabel: string;
  statusColor: string;
  source: "project" | "standalone" | "recurring";
  projectName?: string;
  stageName?: string;
  planItemName?: string;
  // for callbacks
  _projectId?: number;
  _stageId?: number;
  _taskId?: number;
  // original standalone task (for edit modal)
  _standaloneTask?: StandaloneTask;
}

// ─── Props ──────────────────────────────────────────────────────────

interface StandaloneTasksTabProps {
  tasks: StandaloneTask[];
  projects: Project[];
  plans: Plan[];
  recurringTasks: RecurringTask[];
  channels: Channel[];
  employees?: { name: string }[];
  onSave: (task: StandaloneTask) => void;
  onDelete: (taskId: number) => void;
  onUpdateProjectTaskStatus?: (
    projectId: number,
    stageId: number,
    taskId: number,
    status: ProjectTaskStatus,
  ) => void;
  onUpdateStandaloneTaskStatus?: (
    taskId: number,
    status: StandaloneTaskStatus,
  ) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────

const standaloneStatusLabels: Record<StandaloneTaskStatus, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  done: "Готово",
};

const standaloneStatusColors: Record<StandaloneTaskStatus, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const STATUS_ORDER: Record<string, number> = { in_progress: 0, todo: 1, recurring: 2, done: 3 };

// ─── Component ──────────────────────────────────────────────────────

export default function StandaloneTasksTab({
  tasks,
  projects,
  plans,
  recurringTasks,
  channels,
  employees,
  onSave,
  onDelete,
  onUpdateProjectTaskStatus,
  onUpdateStandaloneTaskStatus,
}: StandaloneTasksTabProps) {
  const [editingTask, setEditingTask] = useState<StandaloneTask | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);

  const today = todayKey();

  // Plan item lookup: planItemId → planItem name
  const planItemMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const plan of plans) {
      for (const item of plan.items) {
        map.set(item.id, item.name);
      }
    }
    return map;
  }, [plans]);

  // Build unified list of tasks for today
  const rows = useMemo(() => {
    const result: TodayRow[] = [];

    // 1) Project tasks due today
    for (const project of projects) {
      const planItemName = project.planItemId ? planItemMap.get(project.planItemId) : undefined;
      for (const stage of project.stages) {
        for (const task of stage.tasks) {
          if (task.deadline !== today) continue;
          result.push({
            key: `p-${project.id}-${stage.id}-${task.id}`,
            name: task.name,
            assignee: task.assignee,
            dueTime: task.dueTime,
            status: task.status,
            statusLabel: projectTaskStatusLabels[task.status],
            statusColor: projectTaskStatusColors[task.status],
            source: "project",
            projectName: project.name,
            stageName: stage.name,
            planItemName,
            _projectId: project.id,
            _stageId: stage.id,
            _taskId: task.id,
          });
        }
      }
    }

    // 2) Standalone tasks due today
    for (const task of tasks) {
      if (task.deadline !== today) continue;
      result.push({
        key: `s-${task.id}`,
        name: task.name,
        assignee: task.assignee,
        dueTime: task.dueTime,
        status: task.status,
        statusLabel: standaloneStatusLabels[task.status],
        statusColor: standaloneStatusColors[task.status],
        source: "standalone",
        _taskId: task.id,
        _standaloneTask: task,
      });
    }

    // 3) Recurring tasks occurring today
    for (const rt of recurringTasks) {
      const instances = generateInstances(rt, today, today);
      if (instances.length > 0) {
        result.push({
          key: `r-${rt.id}`,
          name: rt.name,
          assignee: rt.assignee,
          dueTime: rt.dueTime,
          status: "recurring",
          statusLabel: "Регулярная",
          statusColor: "bg-amber-100 text-amber-700",
          source: "recurring",
        });
      }
    }

    // Apply assignee filter
    const filtered = filterAssignee
      ? result.filter((r) => r.assignee === filterAssignee)
      : result;

    // Sort: in_progress first, then todo, then recurring, then done
    filtered.sort((a, b) => {
      const oa = STATUS_ORDER[a.status] ?? 9;
      const ob = STATUS_ORDER[b.status] ?? 9;
      if (oa !== ob) return oa - ob;
      // Secondary sort by dueTime (tasks with time first)
      const ta = a.dueTime || "99:99";
      const tb = b.dueTime || "99:99";
      return ta.localeCompare(tb);
    });

    return filtered;
  }, [projects, tasks, recurringTasks, today, planItemMap, filterAssignee]);

  // All unique assignees for the filter
  const allAssignees = useMemo(() => {
    const set = new Set<string>();
    // From employees prop (primary source)
    if (employees) {
      for (const emp of employees) {
        set.add(emp.name);
      }
    }
    // Also add names from today's tasks in case some aren't in employees list
    for (const project of projects) {
      for (const stage of project.stages) {
        for (const task of stage.tasks) {
          if (task.deadline === today && task.assignee) set.add(task.assignee);
        }
      }
    }
    for (const task of tasks) {
      if (task.deadline === today && task.assignee) set.add(task.assignee);
    }
    for (const rt of recurringTasks) {
      if (rt.assignee) set.add(rt.assignee);
    }
    return [...set].sort();
  }, [employees, projects, tasks, recurringTasks, today]);

  // Stats
  const counts = useMemo(() => {
    const total = rows.length;
    const done = rows.filter((r) => r.status === "done").length;
    const active = total - done;
    const recurring = rows.filter((r) => r.source === "recurring").length;
    return { total, done, active, recurring };
  }, [rows]);

  // Toggle status
  const handleToggle = (row: TodayRow) => {
    if (row.source === "recurring") return;
    const newStatus = row.status === "done" ? "todo" : "done";
    if (row.source === "project" && onUpdateProjectTaskStatus && row._projectId != null && row._stageId != null && row._taskId != null) {
      onUpdateProjectTaskStatus(row._projectId, row._stageId, row._taskId, newStatus as ProjectTaskStatus);
    } else if (row.source === "standalone" && row._standaloneTask) {
      onSave({ ...row._standaloneTask, status: newStatus as StandaloneTaskStatus });
    }
  };

  // Edit handler — only for standalone tasks
  const handleRowClick = (row: TodayRow) => {
    if (row.source === "standalone" && row._standaloneTask) {
      setEditingTask(row._standaloneTask);
    }
  };

  const handleModalSave = (task: StandaloneTask) => {
    onSave(task);
    setEditingTask(null);
    setShowCreateModal(false);
  };

  const handleModalDelete = (taskId: number) => {
    onDelete(taskId);
    setEditingTask(null);
  };

  const todayLabel = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Задачи на сегодня</h2>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Employee filter */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Сотрудник:</label>
            <select
              value={filterAssignee ?? "__all__"}
              onChange={(e) => setFilterAssignee(e.target.value === "__all__" ? null : e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[180px]"
            >
              <option value="__all__">Все сотрудники</option>
              {allAssignees.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + Новая задача
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Всего на сегодня</p>
          <p className="text-xl font-black text-gray-900">{counts.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Активных</p>
          <p className="text-xl font-black text-blue-600">{counts.active}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Готово</p>
          <p className="text-xl font-black text-green-600">{counts.done}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Регулярных</p>
          <p className="text-xl font-black text-amber-600">{counts.recurring}</p>
        </div>
      </div>

      {/* Tasks list */}
      {rows.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <p className="text-lg">Нет задач на сегодня</p>
          <p className="text-sm mt-1">Все задачи выполнены или запланированы на другие дни</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const isDone = row.status === "done";
            const isRecurring = row.source === "recurring";
            const isClickable = row.source === "standalone";

            return (
              <div
                key={row.key}
                className={`bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 transition-colors ${
                  isDone ? "opacity-60" : ""
                } ${isClickable ? "cursor-pointer hover:border-indigo-200" : ""}`}
                onClick={() => handleRowClick(row)}
              >
                {/* Checkbox */}
                {!isRecurring ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(row);
                    }}
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      isDone
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300 hover:border-green-400"
                    }`}
                    title={isDone ? "Вернуть в работу" : "Отметить как готово"}
                  >
                    {isDone && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-amber-100 flex-shrink-0 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                  </div>
                )}

                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium truncate ${
                        isDone ? "line-through text-gray-400" : "text-gray-900"
                      }`}
                    >
                      {row.name}
                    </span>
                    {row.dueTime && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {row.dueTime}
                      </span>
                    )}
                  </div>
                  {/* Source info: project + stage */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {row.source === "project" && row.projectName && (
                      <>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 truncate max-w-[180px]">
                          {row.projectName}
                        </span>
                        {row.planItemName && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 truncate max-w-[140px]">
                            {row.planItemName}
                          </span>
                        )}
                        {row.stageName && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 truncate max-w-[140px]">
                            {row.stageName}
                          </span>
                        )}
                      </>
                    )}
                    {row.source === "standalone" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-600">
                        Текущая задача
                      </span>
                    )}
                    {row.source === "recurring" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
                        Регулярная
                      </span>
                    )}
                  </div>
                </div>

                {/* Assignee */}
                <span className="text-xs text-gray-500 hidden sm:block flex-shrink-0">
                  {row.assignee}
                </span>

                {/* Status badge */}
                <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${row.statusColor}`}>
                  {row.statusLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      {editingTask && (
        <StandaloneTaskModal
          task={editingTask}
          channels={channels}
          employees={employees ?? []}
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
          employees={employees ?? []}
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
  employees: { name: string }[];
  onSave: (task: StandaloneTask) => void;
  onDelete?: (taskId: number) => void;
  onClose: () => void;
}

const statusOptions: StandaloneTaskStatus[] = ["todo", "in_progress", "done"];

export function StandaloneTaskModal({
  task,
  channels,
  employees,
  onSave,
  onDelete,
  onClose,
}: StandaloneTaskModalProps) {
  const isCreate = task === null;
  const [name, setName] = useState(task?.name ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [assignee, setAssignee] = useState(task?.assignee ?? employees[0]?.name ?? "");
  const [status, setStatus] = useState<StandaloneTaskStatus>(task?.status ?? "todo");
  const [deadline, setDeadline] = useState(task?.deadline ?? todayKey());
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
    if (task && onDelete && window.confirm("Удалить задачу?")) {
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
              {employees.map((m) => (
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
