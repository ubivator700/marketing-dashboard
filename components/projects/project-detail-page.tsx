"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Project, Stage, ProjectTask } from "@/types/dashboard";
import { useAppContext } from "@/lib/app-context";
import {
  calcProjectCompletion,
  calcStageCompletion,
  addStage,
  updateStage,
  deleteStage as removeStage,
  addProjectTask,
  updateProjectTask,
  deleteProjectTask as removeProjectTask,
} from "@/lib/project-utils";
import { totalExpensesForProject } from "@/lib/expense-utils";
import ProgressBar from "@/components/dashboard/progress-bar";
import { projectTaskStatusLabels, projectTaskStatusColors } from "@/lib/projects-data";
import StageEditModal from "./stage-edit-modal";
import ProjectTaskEditModal from "./project-task-edit-modal";

interface ProjectDetailPageProps {
  projectId: number;
}

export default function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const { projects, setProjects, expenses, employees } = useAppContext();

  const project = projects.find((p) => p.id === projectId);

  const [stageModal, setStageModal] = useState<{ stage: Stage | null; projectId: number; projectName: string } | null>(null);
  const [taskModal, setTaskModal] = useState<{ task: ProjectTask | null; projectId: number; stageId: number; stageName: string } | null>(null);
  const [expandedStages, setExpandedStages] = useState<Set<number>>(() => new Set());

  const toggleStage = (stageId: number) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  };

  // ─── Stage CRUD ───
  const handleStageSave = useCallback(
    (stage: Stage) => {
      setProjects((prev) => {
        const p = prev.find((p) => p.id === projectId);
        if (!p) return prev;
        const exists = p.stages.some((s) => s.id === stage.id);
        if (exists) return updateStage(prev, projectId, stage.id, stage);
        return addStage(prev, projectId, stage);
      });
      setStageModal(null);
    },
    [setProjects, projectId]
  );

  const handleStageDelete = useCallback(
    (stageId: number) => {
      setProjects((prev) => removeStage(prev, projectId, stageId));
      setStageModal(null);
    },
    [setProjects, projectId]
  );

  // ─── Task CRUD ───
  const handleTaskSave = useCallback(
    (task: ProjectTask) => {
      setProjects((prev) => {
        const p = prev.find((pr) => pr.id === task.projectId);
        if (!p) return prev;
        const stage = p.stages.find((s) => s.id === task.stageId);
        if (!stage) return prev;
        const exists = stage.tasks.some((t) => t.id === task.id);
        if (exists) return updateProjectTask(prev, task.projectId, task.stageId, task.id, task);
        return addProjectTask(prev, task.projectId, task.stageId, task);
      });
      setTaskModal(null);
    },
    [setProjects]
  );

  const handleTaskDelete = useCallback(
    (pid: number, sid: number, tid: number) => {
      setProjects((prev) => removeProjectTask(prev, pid, sid, tid));
      setTaskModal(null);
    },
    [setProjects]
  );

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/projects" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
            ← Назад к проектам
          </Link>
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Проект не найден</p>
          </div>
        </div>
      </div>
    );
  }

  const completion = calcProjectCompletion(project);
  const totalExp = totalExpensesForProject(expenses, project.id);
  const allTasks = project.stages.flatMap((s) => s.tasks);
  const doneTasks = allTasks.filter((t) => t.status === "done").length;
  const inProgressTasks = allTasks.filter((t) => t.status === "in_progress").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <Link href="/projects" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium inline-flex items-center gap-1 mb-4">
          ← Назад к проектам
        </Link>

        {/* Project header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-gray-900">{project.name}</h1>
              {project.goal && (
                <p className="text-sm text-indigo-600 mt-1 font-medium">Цель: {project.goal}</p>
              )}
              {project.description && (
                <p className="text-sm text-gray-500 mt-2">{project.description}</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-5">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Прогресс</p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <ProgressBar progress={completion} color="#6366f1" height="h-2.5" />
                </div>
                <span className="text-lg font-black text-indigo-600">{completion}%</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Задачи</p>
              <p className="text-lg font-black text-gray-900">{allTasks.length}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Готово</p>
              <p className="text-lg font-black text-green-600">{doneTasks}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">В работе</p>
              <p className="text-lg font-black text-blue-600">{inProgressTasks}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Расходы</p>
              <p className="text-lg font-black text-gray-900">
                {totalExp > 0 ? `${totalExp.toLocaleString("ru-RU")} ₽` : "—"}
              </p>
            </div>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
            <span>
              Дедлайн:{" "}
              {new Date(project.deadline + "T00:00:00").toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span>Этапов: {project.stages.length}</span>
            {project.responsible && (
              <span className="text-indigo-500 font-medium">Ответственный: {project.responsible}</span>
            )}
          </div>
        </div>

        {/* Stages */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Этапы</h2>
          <button
            onClick={() =>
              setStageModal({ stage: null, projectId: project.id, projectName: project.name })
            }
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            + Новый этап
          </button>
        </div>

        {project.stages.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <p>Нет этапов</p>
            <p className="text-sm mt-1">Создайте первый этап проекта</p>
          </div>
        ) : (
          <div className="space-y-3">
            {project.stages.map((stage) => {
              const stageCompletion = calcStageCompletion(stage);
              const isExpanded = expandedStages.has(stage.id);

              return (
                <div
                  key={stage.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* Stage header */}
                  <div className="px-5 py-4 flex items-center gap-4 group">
                    <button
                      onClick={() => toggleStage(stage.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors text-lg flex-shrink-0"
                    >
                      {isExpanded ? "▾" : "▸"}
                    </button>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => toggleStage(stage.id)}
                    >
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-bold text-gray-900">{stage.name}</h3>
                        <span className="text-xs text-gray-400">
                          {new Date(stage.deadline + "T00:00:00").toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "long",
                          })}
                        </span>
                      </div>
                      {stage.result && (
                        <p className="text-sm text-gray-500 mt-0.5">Результат: {stage.result}</p>
                      )}
                      {stage.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{stage.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="w-32">
                        <ProgressBar progress={stageCompletion} color="#6366f1" height="h-2" />
                      </div>
                      <span className="text-sm font-bold text-indigo-600 w-10 text-right">
                        {stageCompletion}%
                      </span>
                      <span className="text-xs text-gray-400">{stage.tasks.length} задач</span>
                      <button
                        onClick={() =>
                          setStageModal({
                            stage,
                            projectId: project.id,
                            projectName: project.name,
                          })
                        }
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-600"
                        title="Редактировать этап"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm("Удалить этап и все его задачи?"))
                            handleStageDelete(stage.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                        title="Удалить этап"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Tasks */}
                  {isExpanded && (
                    <div className="px-5 pb-4 border-t border-gray-100 pt-3 space-y-1">
                      {stage.tasks.length === 0 ? (
                        <p className="text-sm text-gray-400 py-3 text-center">Нет задач</p>
                      ) : (
                        stage.tasks.map((task) => (
                          <div
                            key={task.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group ${task.status === "done" ? "opacity-60" : ""}`}
                          >
                            <button
                              onClick={() => {
                                const newStatus = task.status === "done" ? "todo" : "done";
                                setProjects((prev) =>
                                  prev.map((p) =>
                                    p.id !== project.id ? p : {
                                      ...p,
                                      stages: p.stages.map((s) =>
                                        s.id !== stage.id ? s : {
                                          ...s,
                                          tasks: s.tasks.map((t) =>
                                            t.id !== task.id ? t : { ...t, status: newStatus }
                                          ),
                                        }
                                      ),
                                    }
                                  )
                                );
                              }}
                              className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
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
                            <button
                              onClick={() =>
                                setTaskModal({
                                  task,
                                  projectId: project.id,
                                  stageId: stage.id,
                                  stageName: stage.name,
                                })
                              }
                              className="flex-1 min-w-0 text-left flex items-center gap-3 cursor-pointer"
                            >
                              <span className={`text-sm text-gray-800 flex-1 min-w-0 font-medium ${task.status === "done" ? "line-through text-gray-400" : ""}`}>
                                {task.name}
                              </span>
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                {task.assignee}
                              </span>
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                {new Date(task.deadline + "T00:00:00").toLocaleDateString("ru-RU", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            </button>
                          </div>
                        ))
                      )}
                      <button
                        onClick={() =>
                          setTaskModal({
                            task: null,
                            projectId: project.id,
                            stageId: stage.id,
                            stageName: stage.name,
                          })
                        }
                        className="w-full py-2.5 mt-1 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
                      >
                        + Новая задача
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {stageModal && (
        <StageEditModal
          stage={stageModal.stage}
          projectId={stageModal.projectId}
          projectName={stageModal.projectName}
          onSave={handleStageSave}
          onDelete={
            stageModal.stage
              ? (sid) => handleStageDelete(sid)
              : undefined
          }
          onClose={() => setStageModal(null)}
        />
      )}

      {taskModal && (
        <ProjectTaskEditModal
          task={taskModal.task}
          projectId={taskModal.projectId}
          stageId={taskModal.stageId}
          stageName={taskModal.stageName}
          employees={employees}
          onSave={handleTaskSave}
          onDelete={
            taskModal.task
              ? (tid) => handleTaskDelete(taskModal.projectId, taskModal.stageId, tid)
              : undefined
          }
          onClose={() => setTaskModal(null)}
        />
      )}
    </div>
  );
}
