"use client";

import { useState, useMemo, useEffect } from "react";
import type {
  Project,
  ProjectTask,
  ProjectTaskStatus,
  StandaloneTask,
  StandaloneTaskStatus,
  Channel,
  Employee,
} from "@/types/dashboard";
import {
  projectTaskStatusLabels,
  projectTaskStatusColors,
} from "@/lib/projects-data";
import { StandaloneTaskModal } from "./standalone-tasks-tab";

// ─── Types ───────────────────────────────────────────────────────────

interface UnifiedTask {
  id: string;
  name: string;
  description: string;
  assignee: string;
  deadline: string;
  status: ProjectTaskStatus | StandaloneTaskStatus;
  statusLabel: string;
  statusColor: string;
  source: "project" | "standalone" | "content";
  projectName?: string;
  stageName?: string;
  contentReelName?: string;
  contentProjectName?: string;
  // For callbacks
  _projectId?: number;
  _stageId?: number;
  _taskId: number;
}

type SortField = "deadline" | "status" | "assignee" | "project";
type SortDir = "asc" | "desc";
type FilterStatus = "all" | ProjectTaskStatus;

interface AllTasksTabProps {
  projects: Project[];
  standaloneTasks: StandaloneTask[];
  channels?: Channel[];
  employees?: Employee[];
  defaultFilterAssignee?: string;
  onCreateStandaloneTask?: (task: StandaloneTask) => void;
  onEditProjectTask?: (projectId: number, stageId: number, task: ProjectTask) => void;
  onEditStandaloneTask?: (task: StandaloneTask) => void;
  onDeleteProjectTask?: (projectId: number, stageId: number, taskId: number) => void;
  onDeleteStandaloneTask?: (taskId: number) => void;
  onUpdateProjectTaskStatus?: (
    projectId: number,
    stageId: number,
    taskId: number,
    status: ProjectTaskStatus
  ) => void;
  onUpdateStandaloneTaskStatus?: (
    taskId: number,
    status: StandaloneTaskStatus
  ) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────

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

const STATUS_ORDER: Record<string, number> = {
  in_progress: 0,
  todo: 1,
  done: 2,
};

function isOverdue(deadline: string, status: string): boolean {
  if (status === "done") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline + "T00:00:00");
  return d < today;
}

function isToday(deadline: string): boolean {
  const today = new Date();
  const d = new Date(deadline + "T00:00:00");
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

// ─── Component ───────────────────────────────────────────────────────

export default function AllTasksTab({
  projects,
  standaloneTasks,
  channels = [],
  employees = [],
  defaultFilterAssignee,
  onCreateStandaloneTask,
  onEditProjectTask,
  onEditStandaloneTask,
  onDeleteProjectTask,
  onDeleteStandaloneTask,
  onUpdateProjectTaskStatus,
  onUpdateStandaloneTaskStatus,
}: AllTasksTabProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>(defaultFilterAssignee ?? "__all__");
  const [filterProject, setFilterProject] = useState<string>("__all__");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("deadline");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [creatingStandalone, setCreatingStandalone] = useState(false);

  // Sync filter when defaultFilterAssignee from parent changes
  useEffect(() => {
    if (defaultFilterAssignee !== undefined) setFilterAssignee(defaultFilterAssignee);
  }, [defaultFilterAssignee]);

  // ─── Build unified task list ───
  const allTasks = useMemo(() => {
    const tasks: UnifiedTask[] = [];

    // Project tasks (включая теневые контент-проекты — они имеют kind='content')
    for (const project of projects) {
      const isContentProject = project.kind === "content";
      for (const stage of project.stages) {
        for (const task of stage.tasks) {
          tasks.push({
            id: `p-${project.id}-${stage.id}-${task.id}`,
            name: task.name,
            description: task.description,
            assignee: task.assignee,
            deadline: task.deadline,
            status: task.status,
            statusLabel: projectTaskStatusLabels[task.status],
            statusColor: projectTaskStatusColors[task.status],
            source: isContentProject ? "content" : "project",
            projectName: isContentProject ? (project.contentProjectName ?? project.name) : project.name,
            stageName: stage.name,
            contentReelName: task.contentReelName,
            contentProjectName: task.contentProjectName,
            _projectId: project.id,
            _stageId: stage.id,
            _taskId: task.id,
          });
        }
      }
    }

    // Standalone tasks
    for (const task of standaloneTasks) {
      tasks.push({
        id: `s-${task.id}`,
        name: task.name,
        description: task.description,
        assignee: task.assignee,
        deadline: task.deadline,
        status: task.status,
        statusLabel: standaloneStatusLabels[task.status],
        statusColor: standaloneStatusColors[task.status],
        source: "standalone",
        _taskId: task.id,
      });
    }

    return tasks;
  }, [projects, standaloneTasks]);

  // ─── Unique assignees ───
  const allAssignees = useMemo(() => {
    const set = new Set<string>();
    for (const t of allTasks) {
      if (t.assignee) set.add(t.assignee);
    }
    return Array.from(set).sort();
  }, [allTasks]);

  // ─── Filter & sort ───
  const filteredTasks = useMemo(() => {
    let result = allTasks;

    // Status filter
    if (filterStatus !== "all") {
      result = result.filter((t) => t.status === filterStatus);
    }

    // Assignee filter
    if (filterAssignee !== "__all__") {
      result = result.filter((t) => t.assignee === filterAssignee);
    }

    // Project filter
    if (filterProject === "__standalone__") {
      result = result.filter((t) => t.source === "standalone");
    } else if (filterProject !== "__all__") {
      result = result.filter(
        (t) => t.source === "project" && t.projectName === filterProject
      );
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.assignee.toLowerCase().includes(q) ||
          (t.projectName && t.projectName.toLowerCase().includes(q))
      );
    }

    // Sort — для deadline просроченные всегда вверху, потом сегодняшние, потом по дате
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "deadline": {
          // Просроченные → 0, сегодня → 1, остальные → 2 (готовые → 3)
          const urgencyA = a.status === "done" ? 3 : isOverdue(a.deadline, a.status) ? 0 : isToday(a.deadline) ? 1 : 2;
          const urgencyB = b.status === "done" ? 3 : isOverdue(b.deadline, b.status) ? 0 : isToday(b.deadline) ? 1 : 2;
          if (urgencyA !== urgencyB) cmp = urgencyA - urgencyB;
          else cmp = a.deadline.localeCompare(b.deadline);
          break;
        }
        case "status":
          cmp = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
          break;
        case "assignee":
          cmp = a.assignee.localeCompare(b.assignee);
          break;
        case "project":
          cmp = (a.projectName || "яяя").localeCompare(b.projectName || "яяя");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [allTasks, filterStatus, filterAssignee, filterProject, searchQuery, sortField, sortDir]);

  // ─── Stats ───
  const stats = useMemo(() => {
    const total = allTasks.length;
    const done = allTasks.filter((t) => t.status === "done").length;
    const inProgress = allTasks.filter((t) => t.status === "in_progress").length;
    const todo = allTasks.filter((t) => t.status === "todo").length;
    const overdue = allTasks.filter((t) => isOverdue(t.deadline, t.status)).length;
    return { total, done, inProgress, todo, overdue };
  }, [allTasks]);

  // ─── Toggle sort ───
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  };

  // ─── Status cycle on click ───
  function cycleStatus(task: UnifiedTask) {
    const nextStatus: Record<string, ProjectTaskStatus> = {
      todo: "in_progress",
      in_progress: "done",
      done: "todo",
    };
    const newStatus = nextStatus[task.status] || "todo";
    if (task.source === "project" && onUpdateProjectTaskStatus && task._projectId != null && task._stageId != null) {
      onUpdateProjectTaskStatus(task._projectId, task._stageId, task._taskId, newStatus);
    } else if (task.source === "standalone" && onUpdateStandaloneTaskStatus) {
      onUpdateStandaloneTaskStatus(task._taskId, newStatus as StandaloneTaskStatus);
    }
  }

  // ─── Edit handler ───
  function handleEdit(task: UnifiedTask) {
    if (task.source === "project" && onEditProjectTask && task._projectId != null && task._stageId != null) {
      const project = projects.find((p) => p.id === task._projectId);
      const stage = project?.stages.find((s) => s.id === task._stageId);
      const originalTask = stage?.tasks.find((t) => t.id === task._taskId);
      if (originalTask) onEditProjectTask(task._projectId, task._stageId, originalTask);
    } else if (task.source === "standalone" && onEditStandaloneTask) {
      const originalTask = standaloneTasks.find((t) => t.id === task._taskId);
      if (originalTask) onEditStandaloneTask(originalTask);
    }
  }

  // ─── Delete handler ───
  function handleDelete(task: UnifiedTask) {
    if (!window.confirm("Удалить задачу?")) return;
    if (task.source === "project" && onDeleteProjectTask && task._projectId != null && task._stageId != null) {
      onDeleteProjectTask(task._projectId, task._stageId, task._taskId);
    } else if (task.source === "standalone" && onDeleteStandaloneTask) {
      onDeleteStandaloneTask(task._taskId);
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Всего</p>
          <p className="text-xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">К выполнению</p>
          <p className="text-xl font-bold text-gray-600">{stats.todo}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
          <p className="text-xs text-blue-500 font-medium">В работе</p>
          <p className="text-xl font-bold text-blue-600">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
          <p className="text-xs text-green-500 font-medium">Готово</p>
          <p className="text-xl font-bold text-green-600">{stats.done}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm col-span-2 sm:col-span-1">
          <p className="text-xs text-red-500 font-medium">Просрочено</p>
          <p className="text-xl font-bold text-red-600">{stats.overdue}</p>
        </div>
      </div>

      {/* Action buttons */}
      {onCreateStandaloneTask && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCreatingStandalone(true)}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            + Задача
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по задачам..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
            />
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
          >
            <option value="all">Все статусы</option>
            <option value="todo">К выполнению</option>
            <option value="in_progress">В работе</option>
            <option value="done">Готово</option>
          </select>

          {/* Assignee filter */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
          >
            <option value="__all__">Все исполнители</option>
            {allAssignees.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          {/* Project filter */}
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
          >
            <option value="__all__">Все источники</option>
            <option value="__standalone__">Текущие задачи</option>
            {projects.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[1fr_140px_120px_120px_100px_60px] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span>Задача</span>
          <button
            onClick={() => handleSort("project")}
            className="text-left hover:text-gray-700 transition-colors"
          >
            Проект {sortIcon("project")}
          </button>
          <button
            onClick={() => handleSort("assignee")}
            className="text-left hover:text-gray-700 transition-colors"
          >
            Исполнитель {sortIcon("assignee")}
          </button>
          <button
            onClick={() => handleSort("deadline")}
            className="text-left hover:text-gray-700 transition-colors"
          >
            Срок {sortIcon("deadline")}
          </button>
          <button
            onClick={() => handleSort("status")}
            className="text-left hover:text-gray-700 transition-colors"
          >
            Статус {sortIcon("status")}
          </button>
          <span></span>
        </div>

        {/* Task rows */}
        {filteredTasks.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            Нет задач по выбранным фильтрам
          </div>
        )}

        {filteredTasks.map((task) => {
          const overdue = isOverdue(task.deadline, task.status);
          const today = isToday(task.deadline);
          const isDone = task.status === "done";

          return (
            <div
              key={task.id}
              className={`grid grid-cols-1 sm:grid-cols-[1fr_140px_120px_120px_100px_60px] gap-1 sm:gap-2 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors group ${
                isDone ? "opacity-60" : ""
              }`}
            >
              {/* Task name + description */}
              <div className="flex items-start gap-2 min-w-0">
                {/* Status checkbox */}
                <button
                  onClick={() => cycleStatus(task)}
                  className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    isDone
                      ? "bg-green-500 border-green-500 text-white"
                      : task.status === "in_progress"
                      ? "bg-blue-50 border-blue-400 text-blue-400"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  title="Сменить статус"
                >
                  {isDone && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {task.status === "in_progress" && (
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => handleEdit(task)}
                    className={`text-sm font-medium text-left leading-snug hover:text-indigo-600 transition-colors ${
                      isDone ? "line-through text-gray-400" : "text-gray-900"
                    }`}
                  >
                    {task.name}
                  </button>
                  {task.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                      {task.description}
                    </p>
                  )}
                  {/* Mobile-only meta */}
                  <div className="flex flex-wrap items-center gap-2 mt-1 sm:hidden">
                    {task.projectName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
                        {task.projectName}
                      </span>
                    )}
                    {!task.projectName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-600">
                        Текущая
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      {task.assignee}
                    </span>
                    <span
                      className={`text-[10px] ${
                        overdue
                          ? "text-red-500 font-medium"
                          : today
                          ? "text-amber-500 font-medium"
                          : "text-gray-400"
                      }`}
                    >
                      {new Date(task.deadline + "T00:00:00").toLocaleDateString(
                        "ru-RU",
                        { day: "numeric", month: "short" }
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Project name (desktop) */}
              <div className="hidden sm:flex items-center min-w-0 flex-col items-start gap-0.5">
                {task.source === "content" ? (
                  <>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-700 truncate max-w-full" title={task.contentReelName ? `Контент: ${task.contentReelName}` : task.projectName}>
                      🎬 {task.projectName}
                    </span>
                    {task.contentReelName && (
                      <span className="text-[10px] text-fuchsia-600 truncate max-w-full">
                        {task.contentReelName}
                      </span>
                    )}
                  </>
                ) : task.projectName ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 truncate max-w-full">
                    {task.projectName}
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">
                    Текущая задача
                  </span>
                )}
              </div>

              {/* Assignee (desktop) */}
              <div className="hidden sm:flex items-center">
                <span className="text-xs text-gray-600 truncate">
                  {task.assignee}
                </span>
              </div>

              {/* Deadline (desktop) */}
              <div className="hidden sm:flex items-center">
                <span
                  className={`text-xs font-medium ${
                    overdue
                      ? "text-red-500"
                      : today
                      ? "text-amber-500"
                      : isDone
                      ? "text-gray-400"
                      : "text-gray-600"
                  }`}
                >
                  {new Date(task.deadline + "T00:00:00").toLocaleDateString(
                    "ru-RU",
                    { day: "numeric", month: "short", year: "numeric" }
                  )}
                  {overdue && " !"}
                </span>
              </div>

              {/* Status (desktop) */}
              <div className="hidden sm:flex items-center">
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${task.statusColor}`}
                >
                  {task.statusLabel}
                </span>
              </div>

              {/* Actions (desktop) */}
              <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(task)}
                  className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                  title="Редактировать"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(task)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Удалить"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary line */}
      <div className="text-xs text-gray-400 px-1">
        Показано {filteredTasks.length} из {allTasks.length} задач
      </div>

      {/* Create-standalone modal */}
      {creatingStandalone && onCreateStandaloneTask && (
        <StandaloneTaskModal
          task={null}
          channels={channels}
          employees={employees}
          onSave={(task) => {
            onCreateStandaloneTask(task);
            setCreatingStandalone(false);
          }}
          onClose={() => setCreatingStandalone(false)}
        />
      )}
    </div>
  );
}
