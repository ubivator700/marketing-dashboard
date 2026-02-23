"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import type { Project, Stage, ProjectTask } from "@/types/dashboard";
import { calcProjectCompletion, calcStageCompletion } from "@/lib/project-utils";
import { projectTaskStatusColors, projectTaskStatusLabels } from "@/lib/projects-data";
import ProgressBar from "@/components/dashboard/progress-bar";

// Stage colors for visual distinction
const stageColors = [
  { bg: "bg-indigo-50", border: "border-indigo-200", accent: "#6366f1", text: "text-indigo-700", progressBg: "bg-indigo-500" },
  { bg: "bg-emerald-50", border: "border-emerald-200", accent: "#10b981", text: "text-emerald-700", progressBg: "bg-emerald-500" },
  { bg: "bg-amber-50", border: "border-amber-200", accent: "#f59e0b", text: "text-amber-700", progressBg: "bg-amber-500" },
  { bg: "bg-rose-50", border: "border-rose-200", accent: "#f43f5e", text: "text-rose-700", progressBg: "bg-rose-500" },
  { bg: "bg-sky-50", border: "border-sky-200", accent: "#0ea5e9", text: "text-sky-700", progressBg: "bg-sky-500" },
  { bg: "bg-purple-50", border: "border-purple-200", accent: "#a855f7", text: "text-purple-700", progressBg: "bg-purple-500" },
  { bg: "bg-teal-50", border: "border-teal-200", accent: "#14b8a6", text: "text-teal-700", progressBg: "bg-teal-500" },
  { bg: "bg-orange-50", border: "border-orange-200", accent: "#f97316", text: "text-orange-700", progressBg: "bg-orange-500" },
];

interface SortableProjectCardProps {
  project: Project;
  totalExpenses: number;
  onEditProject: (project: Project) => void;
  onDeleteProject: (projectId: number) => void;
  onEditStage: (projectId: number, stage: Stage) => void;
  onDeleteStage: (projectId: number, stageId: number) => void;
  onAddStage: (projectId: number) => void;
  onEditTask: (projectId: number, stageId: number, task: ProjectTask) => void;
  onAddTask: (projectId: number, stageId: number) => void;
}

export default function SortableProjectCard({
  project,
  totalExpenses,
  onEditProject,
  onDeleteProject,
  onEditStage,
  onDeleteStage,
  onAddStage,
  onEditTask,
  onAddTask,
}: SortableProjectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [stagePopup, setStagePopup] = useState<{ stage: Stage; projectId: number } | null>(null);
  const completion = calcProjectCompletion(project);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const deadlineLabel = new Date(project.deadline + "T00:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const expensesLabel = totalExpenses > 0
    ? `${totalExpenses.toLocaleString("ru-RU")} ₽`
    : "—";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Project header — click anywhere to expand/collapse */}
      <div
        className="px-5 py-4 flex items-start gap-3 group cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
          title="Перетащить для смены приоритета"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span onClick={(e) => e.stopPropagation()}>
                <Link
                  href={`/projects/${project.id}`}
                  className="text-base font-bold text-gray-900 leading-tight hover:text-indigo-600 transition-colors"
                >
                  {project.name}
                </Link>
              </span>
              {project.goal && (
                <p className="text-sm text-gray-500 mt-1">Цель: {project.goal}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditProject(project);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-600 p-1"
                title="Редактировать"
              >
                ✏️
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm("Удалить проект? Связанные расходы будут откреплены."))
                    onDeleteProject(project.id);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1"
                title="Удалить"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="flex-1">
                <ProgressBar progress={completion} color="#6366f1" height="h-2.5" />
              </div>
              <span className="text-sm font-bold text-indigo-600">{completion}%</span>
            </div>
            <span className="text-xs text-gray-400">Дедлайн: {deadlineLabel}</span>
            <span className="text-xs text-gray-400">Расходы: {expensesLabel}</span>
            <span className="text-xs text-gray-400">Этапов: {project.stages.length}</span>
            {project.responsible && (
              <span className="text-xs text-indigo-500 font-medium">{project.responsible}</span>
            )}
            {/* Expand/collapse chevron indicator */}
            <span className="text-gray-400 text-xs transition-transform">
              {expanded ? "▾" : "▸"}
            </span>
          </div>
        </div>
      </div>

      {/* Stages as colored rectangular blocks, 3 per row */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-100 pt-4">
          {project.description && (
            <p className="text-sm text-gray-500 mb-4">{project.description}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {project.stages.map((stage, idx) => {
              const color = stageColors[idx % stageColors.length];
              const stageCompletion = calcStageCompletion(stage);
              const doneTasks = stage.tasks.filter((t) => t.status === "done").length;

              return (
                <div
                  key={stage.id}
                  className={`${color.bg} border ${color.border} rounded-xl p-4 relative group/stage transition-shadow hover:shadow-md cursor-pointer`}
                  onClick={() => setStagePopup({ stage, projectId: project.id })}
                >
                  {/* Left accent bar */}
                  <div
                    className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
                    style={{ backgroundColor: color.accent }}
                  />

                  {/* Stage content */}
                  <div className="pl-2">
                    {/* Stage header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className={`text-sm font-bold ${color.text}`}>{stage.name}</h4>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/stage:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditStage(project.id, stage);
                          }}
                          className="text-gray-400 hover:text-indigo-600 p-0.5 text-xs"
                          title="Редактировать"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Удалить этап?")) onDeleteStage(project.id, stage.id);
                          }}
                          className="text-gray-400 hover:text-red-500 p-0.5 text-xs"
                          title="Удалить"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {stage.result && (
                      <p className="text-[11px] text-gray-500 mb-2 line-clamp-2">{stage.result}</p>
                    )}

                    {/* Progress */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 bg-white/60 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${color.progressBg}`}
                          style={{ width: `${stageCompletion}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${color.text}`}>{stageCompletion}%</span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-2">
                      <span>{doneTasks}/{stage.tasks.length} задач</span>
                      <span>·</span>
                      <span>
                        {new Date(stage.deadline + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                      </span>
                    </div>

                    {/* Tasks mini-list */}
                    {stage.tasks.length > 0 && (
                      <div className="space-y-0.5 mt-2">
                        {stage.tasks.slice(0, 3).map((task) => (
                          <button
                            key={task.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTask(project.id, stage.id, task);
                            }}
                            className="w-full text-left flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-white/60 transition-colors"
                          >
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${projectTaskStatusColors[task.status]}`}>
                              {projectTaskStatusLabels[task.status]}
                            </span>
                            <span className="text-[11px] text-gray-700 flex-1 min-w-0 truncate">{task.name}</span>
                          </button>
                        ))}
                        {stage.tasks.length > 3 && (
                          <p className="text-[10px] text-gray-400 px-1.5 py-0.5">+ ещё {stage.tasks.length - 3}</p>
                        )}
                      </div>
                    )}

                    {/* Add task button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddTask(project.id, stage.id);
                      }}
                      className="w-full mt-2 py-1.5 border border-dashed border-gray-300 rounded-lg text-[10px] text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors bg-white/30"
                    >
                      + Задача
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add stage block */}
            <button
              onClick={() => onAddStage(project.id)}
              className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-center justify-center text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors min-h-[120px]"
            >
              + Новый этап
            </button>
          </div>
        </div>
      )}

      {/* Stage popup modal */}
      {stagePopup && (() => {
        const popupStage = stagePopup.stage;
        const popupProjectId = stagePopup.projectId;
        const popupIdx = project.stages.findIndex((s) => s.id === popupStage.id);
        const popupColor = stageColors[(popupIdx >= 0 ? popupIdx : 0) % stageColors.length];
        const popupCompletion = calcStageCompletion(popupStage);
        const popupDoneTasks = popupStage.tasks.filter((t) => t.status === "done").length;

        return (
          <div
            className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center"
            onClick={() => setStagePopup(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-1.5 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: popupColor.accent }}
                  />
                  <h3 className={`text-lg font-bold ${popupColor.text}`}>{popupStage.name}</h3>
                </div>
                <button
                  onClick={() => setStagePopup(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors text-xl flex-shrink-0 leading-none"
                >
                  ×
                </button>
              </div>

              {/* Result / description */}
              {popupStage.result && (
                <p className="text-sm text-gray-500 mb-4">{popupStage.result}</p>
              )}

              {/* Progress bar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${popupColor.progressBg}`}
                    style={{ width: `${popupCompletion}%` }}
                  />
                </div>
                <span className={`text-sm font-bold ${popupColor.text}`}>{popupCompletion}%</span>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                <span>{popupDoneTasks}/{popupStage.tasks.length} задач выполнено</span>
                <span>·</span>
                <span>
                  Дедлайн: {new Date(popupStage.deadline + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                </span>
              </div>

              {/* Full task list */}
              {popupStage.tasks.length > 0 ? (
                <div className="space-y-1 mb-4">
                  {popupStage.tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => {
                        setStagePopup(null);
                        onEditTask(popupProjectId, popupStage.id, task);
                      }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${projectTaskStatusColors[task.status]}`}>
                        {projectTaskStatusLabels[task.status]}
                      </span>
                      <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{task.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 mb-4">Нет задач</p>
              )}

              {/* Add task button */}
              <button
                onClick={() => {
                  setStagePopup(null);
                  onAddTask(popupProjectId, popupStage.id);
                }}
                className="w-full py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
              >
                + Добавить задачу
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
