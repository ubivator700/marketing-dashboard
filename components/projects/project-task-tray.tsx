"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Project, ProjectTask, ProjectTaskStatus } from "@/types/dashboard";
import { projectTaskStatusLabels, projectTaskStatusColors } from "@/lib/projects-data";

interface ProjectTaskTrayProps {
  projects: Project[];
  onEditTask: (projectId: number, stageId: number, task: ProjectTask) => void;
}

export default function ProjectTaskTray({ projects, onEditTask }: ProjectTaskTrayProps) {
  const [statusFilter, setStatusFilter] = useState<ProjectTaskStatus | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<number | null>(null);

  // Flatten all tasks with project/stage context
  const allTasks = useMemo(() => {
    const result: {
      task: ProjectTask;
      projectId: number;
      projectName: string;
      stageName: string;
    }[] = [];
    for (const project of projects) {
      for (const stage of project.stages) {
        for (const task of stage.tasks) {
          result.push({
            task,
            projectId: project.id,
            projectName: project.name,
            stageName: stage.name,
          });
        }
      }
    }
    return result;
  }, [projects]);

  // Unique assignees
  const assignees = useMemo(() => {
    const set = new Set(allTasks.map((t) => t.task.assignee));
    return Array.from(set).sort();
  }, [allTasks]);

  // Filtered tasks
  const filtered = useMemo(() => {
    let result = allTasks;
    if (statusFilter) result = result.filter((t) => t.task.status === statusFilter);
    if (assigneeFilter) result = result.filter((t) => t.task.assignee === assigneeFilter);
    if (projectFilter) result = result.filter((t) => t.projectId === projectFilter);
    return result;
  }, [allTasks, statusFilter, assigneeFilter, projectFilter]);

  // Sort: in_progress first, then todo, then done; within group by deadline
  const sorted = useMemo(() => {
    const order: Record<ProjectTaskStatus, number> = { in_progress: 0, todo: 1, done: 2 };
    return [...filtered].sort((a, b) => {
      const diff = order[a.task.status] - order[b.task.status];
      if (diff !== 0) return diff;
      return a.task.deadline.localeCompare(b.task.deadline);
    });
  }, [filtered]);

  const statuses: (ProjectTaskStatus | null)[] = [null, "todo", "in_progress", "done"];

  const counts = useMemo(() => ({
    total: allTasks.length,
    todo: allTasks.filter((t) => t.task.status === "todo").length,
    in_progress: allTasks.filter((t) => t.task.status === "in_progress").length,
    done: allTasks.filter((t) => t.task.status === "done").length,
  }), [allTasks]);

  return (
    <div>
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

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Status filter */}
        <div className="flex items-center gap-1">
          {statuses.map((s) => (
            <button
              key={s ?? "all"}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === s
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {s === null ? "Все" : projectTaskStatusLabels[s]}
            </button>
          ))}
        </div>

        {/* Assignee filter */}
        <select
          value={assigneeFilter ?? ""}
          onChange={(e) => setAssigneeFilter(e.target.value || null)}
          className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Все исполнители</option>
          {assignees.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* Project filter */}
        <select
          value={projectFilter ?? ""}
          onChange={(e) => setProjectFilter(e.target.value ? Number(e.target.value) : null)}
          className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Все проекты</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Tasks table */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
          <p>Нет задач</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">Статус</th>
                  <th className="px-4 py-3 font-semibold">Задача</th>
                  <th className="px-4 py-3 font-semibold">Проект</th>
                  <th className="px-4 py-3 font-semibold">Этап</th>
                  <th className="px-4 py-3 font-semibold">Исполнитель</th>
                  <th className="px-4 py-3 font-semibold">Дедлайн</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((item) => (
                  <tr
                    key={`${item.projectId}-${item.task.stageId}-${item.task.id}`}
                    onClick={() => onEditTask(item.projectId, item.task.stageId, item.task)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${projectTaskStatusColors[item.task.status]}`}>
                        {projectTaskStatusLabels[item.task.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[250px] truncate">
                      {item.task.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <Link
                        href={`/projects/${item.projectId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        {item.projectName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.stageName}</td>
                    <td className="px-4 py-3 text-gray-500">{item.task.assignee}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(item.task.deadline + "T00:00:00").toLocaleDateString("ru-RU", {
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
    </div>
  );
}
