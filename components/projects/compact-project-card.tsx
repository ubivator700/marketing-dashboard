"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import type { Project, Stage, ProjectTask } from "@/types/dashboard";
import { calcProjectCompletion } from "@/lib/project-utils";

interface CompactProjectCardProps {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  showInline?: boolean;
  onEditStage?: (projectId: number, stage: Stage) => void;
  onDeleteStage?: (projectId: number, stageId: number) => void;
  onAddStage?: (projectId: number) => void;
  onEditTask?: (projectId: number, stageId: number, task: ProjectTask) => void;
  onAddTask?: (projectId: number, stageId: number) => void;
}

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: "bg-gray-200",
  in_progress: "bg-blue-500",
  done: "bg-green-500",
};

export default function CompactProjectCard({
  project,
  onEdit,
  onDelete,
  showInline,
  onEditStage,
  onDeleteStage,
  onAddStage,
  onEditTask,
  onAddTask,
}: CompactProjectCardProps) {
  const [expanded, setExpanded] = useState(false);
  const completion = calcProjectCompletion(project);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `project-${project.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const startLabel = project.startDate
    ? new Date(project.startDate + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    : null;
  const deadlineLabel = new Date(project.deadline + "T00:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });

  // Days left
  const now = new Date();
  const deadlineDate = new Date(project.deadline + "T00:00:00");
  const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const allTasks = project.stages.flatMap((s) => s.tasks);
  const doneTasks = allTasks.filter((t) => t.status === "done").length;
  const inProgressTasks = allTasks.filter((t) => t.status === "in_progress").length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border border-gray-200 overflow-hidden group hover:shadow-sm transition-shadow"
    >
      {/* Main row */}
      <div className="px-3 py-2 flex items-center gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
          title="Перетащить"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>

        {/* Expand chevron for inline view */}
        {showInline && project.stages.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-0" : "-rotate-90"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}

        {/* Progress indicator */}
        <div className="w-8 h-8 relative flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle
              cx="18" cy="18" r="15"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="3"
            />
            <circle
              cx="18" cy="18" r="15"
              fill="none"
              stroke="#6366f1"
              strokeWidth="3"
              strokeDasharray={`${completion * 0.942} 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-gray-600">
            {completion}%
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Link
            href={`/projects/${project.id}`}
            className="text-xs font-semibold text-gray-800 hover:text-indigo-600 transition-colors truncate block"
          >
            {project.name}
          </Link>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 flex-wrap">
            <span className="text-gray-300">
              {doneTasks}/{allTasks.length} задач
              {inProgressTasks > 0 && <span className="text-blue-500 ml-1">{inProgressTasks} в работе</span>}
            </span>
          </div>
        </div>

        {/* Right side: responsible + deadline — large and prominent */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {project.responsible && (
            <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
              {project.responsible}
            </span>
          )}
          <div className="text-right">
            <div className={`text-xs font-bold ${daysLeft < 7 ? "text-red-600" : daysLeft < 30 ? "text-amber-600" : "text-gray-600"}`}>
              {deadlineLabel}
            </div>
            <div className={`text-[10px] font-semibold ${daysLeft < 7 ? "text-red-500" : daysLeft < 30 ? "text-amber-500" : "text-gray-400"}`}>
              {daysLeft > 0 ? `${daysLeft} дн.` : "просрочен"}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="text-gray-400 hover:text-indigo-600 p-0.5 text-[10px]"
            title="Редактировать"
          >
            ✏️
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-gray-400 hover:text-red-500 p-0.5 text-[10px]"
            title="Удалить"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Expanded inline view: stages & tasks */}
      {showInline && expanded && project.stages.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2">
          <div className="space-y-2">
            {project.stages.map((stage) => (
              <StageInlineBlock
                key={stage.id}
                stage={stage}
                projectId={project.id}
                onEditStage={onEditStage}
                onDeleteStage={onDeleteStage}
                onEditTask={onEditTask}
                onAddTask={onAddTask}
              />
            ))}
          </div>
          {onAddStage && (
            <button
              onClick={() => onAddStage(project.id)}
              className="w-full mt-2 py-1 border border-dashed border-gray-300 rounded text-[10px] text-gray-400 hover:text-indigo-500 hover:border-indigo-300 transition-colors"
            >
              + Этап
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stage inline block ───────────────────────────────────────────

function StageInlineBlock({
  stage,
  projectId,
  onEditStage,
  onDeleteStage,
  onEditTask,
  onAddTask,
}: {
  stage: Stage;
  projectId: number;
  onEditStage?: (projectId: number, stage: Stage) => void;
  onDeleteStage?: (projectId: number, stageId: number) => void;
  onEditTask?: (projectId: number, stageId: number, task: ProjectTask) => void;
  onAddTask?: (projectId: number, stageId: number) => void;
}) {
  const [stageExpanded, setStageExpanded] = useState(false);
  const doneTasks = stage.tasks.filter((t) => t.status === "done").length;
  const totalTasks = stage.tasks.length;

  const deadlineLabel = new Date(stage.deadline + "T00:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
  const now = new Date();
  const daysLeft = Math.ceil((new Date(stage.deadline + "T00:00:00").getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Stage header */}
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-gray-50 transition-colors group"
        onClick={() => setStageExpanded(!stageExpanded)}
      >
        {totalTasks > 0 && (
          <svg
            className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${stageExpanded ? "rotate-0" : "-rotate-90"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
        <span className="text-[11px] font-semibold text-gray-700 flex-1 truncate">{stage.name}</span>
        <span className="text-[10px] text-gray-400">{doneTasks}/{totalTasks}</span>
        <div className="text-right flex-shrink-0">
          <span className={`text-[11px] font-bold ${daysLeft < 7 ? "text-red-600" : daysLeft < 30 ? "text-amber-600" : "text-gray-600"}`}>
            {deadlineLabel}
          </span>
          <span className={`text-[10px] font-semibold ml-1 ${daysLeft < 7 ? "text-red-500" : daysLeft < 30 ? "text-amber-500" : "text-gray-400"}`}>
            {daysLeft > 0 ? `${daysLeft}д` : "!"}
          </span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          {onEditStage && (
            <button onClick={() => onEditStage(projectId, stage)} className="text-gray-400 hover:text-indigo-500 p-0.5" title="Редактировать этап">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {onDeleteStage && (
            <button
              onClick={() => { if (window.confirm("Удалить этап?")) onDeleteStage(projectId, stage.id); }}
              className="text-gray-400 hover:text-red-500 p-0.5"
              title="Удалить этап"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tasks */}
      {stageExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/30">
          {stage.tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 px-3 py-1 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors group/task cursor-pointer"
              onClick={() => onEditTask?.(projectId, stage.id, task)}
            >
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${TASK_STATUS_COLORS[task.status] || "bg-gray-200"}`} />
              <span className={`text-[11px] flex-1 truncate ${task.status === "done" ? "text-gray-400 line-through" : "text-gray-700"}`}>
                {task.name}
              </span>
              {task.assignee && (
                <span className="text-[9px] text-gray-400 bg-gray-100 px-1 py-0.5 rounded flex-shrink-0">
                  {task.assignee}
                </span>
              )}
              <span className="text-[9px] text-gray-400 flex-shrink-0">
                {new Date(task.deadline + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
              </span>
            </div>
          ))}
          {onAddTask && (
            <button
              onClick={() => onAddTask(projectId, stage.id)}
              className="w-full py-1 text-[10px] text-gray-400 hover:text-indigo-500 transition-colors"
            >
              + Задача
            </button>
          )}
        </div>
      )}
    </div>
  );
}
