"use client";

import { useMemo, useState } from "react";
import type { Project, Employee, ProjectTaskStatus } from "@/types/dashboard";

interface KanbanBoardProps {
  projects: Project[];
  employees: Employee[];
  cancelledProjectIds?: Set<number>;
  onToggleTaskStatus?: (projectId: number, stageId: number, taskId: number, status: ProjectTaskStatus) => void;
}

type KanbanColumn = "todo" | "in_progress" | "done";

const COLUMN_CONFIG: { id: KanbanColumn; label: string; color: string; bg: string }[] = [
  { id: "todo", label: "К выполнению", color: "text-gray-700", bg: "bg-gray-50" },
  { id: "in_progress", label: "В работе", color: "text-blue-700", bg: "bg-blue-50" },
  { id: "done", label: "Готово", color: "text-green-700", bg: "bg-green-50" },
];

export default function KanbanBoard({ projects, employees, cancelledProjectIds, onToggleTaskStatus }: KanbanBoardProps) {
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null);
  const [filterToday, setFilterToday] = useState(false);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Flatten all tasks with project/stage context
  const allTasks = useMemo(() => {
    const result: {
      id: number;
      name: string;
      description: string;
      assignee: string;
      deadline: string;
      status: KanbanColumn;
      projectId: number;
      projectName: string;
      stageId: number;
      stageName: string;
    }[] = [];

    for (const project of projects) {
      if (project.cancelled || cancelledProjectIds?.has(project.id)) continue;
      if (filterProjectId !== null && project.id !== filterProjectId) continue;
      for (const stage of project.stages) {
        if (stage.cancelled) continue;
        for (const task of stage.tasks) {
          if (task.cancelled) continue;
          if (filterAssignee && task.assignee !== filterAssignee) continue;
          if (filterToday && task.deadline !== todayStr) continue;
          result.push({
            id: task.id,
            name: task.name,
            description: task.description,
            assignee: task.assignee,
            deadline: task.deadline,
            status: task.status as KanbanColumn,
            projectId: project.id,
            projectName: project.name,
            stageId: stage.id,
            stageName: stage.name,
          });
        }
      }
    }
    return result;
  }, [projects, filterAssignee, filterProjectId, filterToday, todayStr]);

  const allAssignees = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      for (const s of p.stages) {
        for (const t of s.tasks) {
          if (t.assignee) set.add(t.assignee);
        }
      }
    }
    return [...set].sort();
  }, [projects]);

  const columns = useMemo(() => {
    const map: Record<KanbanColumn, typeof allTasks> = { todo: [], in_progress: [], done: [] };
    for (const task of allTasks) {
      map[task.status]?.push(task);
    }
    return map;
  }, [allTasks]);

  const now = new Date();

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setFilterToday(!filterToday)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
            filterToday
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
          }`}
        >
          Сегодня
        </button>
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
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Проект:</label>
          <select
            value={filterProjectId ?? "__all__"}
            onChange={(e) => setFilterProjectId(e.target.value === "__all__" ? null : Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[180px]"
          >
            <option value="__all__">Все проекты</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMN_CONFIG.map((col) => {
          const tasks = columns[col.id];
          return (
            <div key={col.id} className={`${col.bg} rounded-xl border border-gray-200 p-3 min-h-[200px]`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>
                  {col.label}
                </h3>
                <span className="text-[10px] font-semibold text-gray-400 bg-white rounded-full px-2 py-0.5">
                  {tasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {tasks.map((task) => {
                  const deadlineDate = new Date(task.deadline + "T00:00:00");
                  const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = daysLeft < 0 && task.status !== "done";

                  return (
                    <div
                      key={`${task.projectId}-${task.stageId}-${task.id}`}
                      className={`bg-white rounded-lg border p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
                        isOverdue ? "border-red-300" : "border-gray-200"
                      }`}
                      onClick={() => {
                        const nextStatus: ProjectTaskStatus = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
                        onToggleTaskStatus?.(task.projectId, task.stageId, task.id, nextStatus);
                      }}
                    >
                      <p className="text-sm font-medium text-gray-900 mb-1">{task.name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded">{task.projectName}</span>
                        <span className="text-[10px] text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded">{task.stageName}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {task.assignee && (
                          <span className="text-[10px] text-gray-500">{task.assignee}</span>
                        )}
                        <span className={`text-[10px] font-medium ${
                          isOverdue ? "text-red-600" : daysLeft <= 3 ? "text-amber-600" : "text-gray-400"
                        }`}>
                          {isOverdue ? `Просрочено на ${Math.abs(daysLeft)} дн.` : `${daysLeft} дн.`}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {tasks.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-6">Нет задач</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
