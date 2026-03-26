"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { PlanItem, Project, Stage, ProjectTask } from "@/types/dashboard";
import { calcProjectCompletion } from "@/lib/project-utils";
import { PLAN_ITEM_COLORS } from "@/lib/plan-colors";
import CompactProjectCard from "./compact-project-card";

interface PlanItemBlockProps {
  item: PlanItem;
  projects: Project[];
  onEdit: () => void;
  onDelete: () => void;
  onAddProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (projectId: number) => void;
  onEditStage?: (projectId: number, stage: Stage) => void;
  onDeleteStage?: (projectId: number, stageId: number) => void;
  onAddStage?: (projectId: number) => void;
  onEditTask?: (projectId: number, stageId: number, task: ProjectTask) => void;
  onAddTask?: (projectId: number, stageId: number) => void;
}

export default function PlanItemBlock({
  item,
  projects,
  onEdit,
  onDelete,
  onAddProject,
  onEditProject,
  onDeleteProject,
  onEditStage,
  onDeleteStage,
  onAddStage,
  onEditTask,
  onAddTask,
}: PlanItemBlockProps) {
  const [collapsed, setCollapsed] = useState(false);
  const color = PLAN_ITEM_COLORS[item.color] || PLAN_ITEM_COLORS.blue;
  const droppableId = `planitem-${item.id}`;

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `planitem-${item.id}` });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: droppableId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const startLabel = item.startDate
    ? new Date(item.startDate + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    : null;
  const deadlineLabel = new Date(item.deadline + "T00:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });

  // Days left
  const now = new Date();
  const deadlineDate = new Date(item.deadline + "T00:00:00");
  const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Check if all tasks in all non-cancelled projects under this item are done
  const isItemCancelled = !!item.cancelled;
  const activeProjects = projects.filter((p) => !p.cancelled);
  const allItemTasks = activeProjects.flatMap((p) => p.stages.filter((s) => !s.cancelled).flatMap((s) => s.tasks.filter((t) => !t.cancelled)));
  const isItemCompleted = !isItemCancelled && allItemTasks.length > 0 && allItemTasks.every((t) => t.status === "done");
  const isItemOverdue = !isItemCancelled && !isItemCompleted && daysLeft < 0;

  const projectIds = projects.map((p) => `project-${p.id}`);

  return (
    <div
      ref={(node) => {
        setSortableRef(node);
        setDroppableRef(node);
      }}
      style={style}
      className={`relative rounded-xl border overflow-hidden transition-all ${
        isItemCancelled ? "border-gray-300 bg-gray-100 opacity-60" : isItemCompleted ? "border-green-300 bg-green-50" : isItemOverdue ? "border-red-300 bg-red-50" : `${color.border} ${color.bg}`
      } ${isOver ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}
    >
      {/* Color stripe on left */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${color.stripe}`} />

      <div className="pl-4 pr-3 py-3">
        {/* Header */}
        <div
          className="flex items-center justify-between gap-2 mb-2 group cursor-pointer"
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className={`${color.meta} opacity-50 hover:opacity-80 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none`}
              title="Перетащить"
              onClick={(e) => e.stopPropagation()}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="5" cy="3" r="1.5" />
                <circle cx="11" cy="3" r="1.5" />
                <circle cx="5" cy="8" r="1.5" />
                <circle cx="11" cy="8" r="1.5" />
                <circle cx="5" cy="13" r="1.5" />
                <circle cx="11" cy="13" r="1.5" />
              </svg>
            </button>
            {/* Collapse chevron */}
            <button
              className={`${color.meta} opacity-60 flex-shrink-0 transition-transform`}
              onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <h4 className={`text-sm font-bold leading-tight ${isItemCancelled ? "text-gray-400 line-through" : color.text}`}>{item.name}</h4>
              {item.result && (
                <p className={`text-[11px] ${color.meta} mt-0.5 line-clamp-2`}>{item.result}</p>
              )}
            </div>
          </div>
          {/* Right side: deadline + responsible — large and prominent */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {item.responsible && (
              <span className={`text-sm font-bold ${color.text} bg-white/60 px-2 py-0.5 rounded-lg`}>
                {item.responsible}
              </span>
            )}
            <div className="text-right">
              <div className={`text-sm font-bold ${isItemCancelled ? "text-gray-400" : isItemCompleted ? "text-green-600" : isItemOverdue ? "text-red-600" : daysLeft <= 3 ? "text-amber-600" : color.text}`}>
                {deadlineLabel}
              </div>
              <div className={`text-[11px] font-semibold ${isItemCancelled ? "text-gray-400" : isItemCompleted ? "text-green-500" : isItemOverdue ? "text-red-500" : daysLeft <= 3 ? "text-amber-500" : color.meta}`}>
                {isItemCancelled ? "Отменён" : isItemCompleted ? "Выполнен" : isItemOverdue ? "просрочен" : `${daysLeft} дн.`}
              </div>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={onEdit}
                className={`${color.meta} hover:opacity-80 p-0.5 text-xs`}
                title="Редактировать"
              >
                ✏️
              </button>
              <button
                onClick={() => {
                  if (window.confirm("Удалить пункт плана?")) onDelete();
                }}
                className="text-red-600 hover:text-red-800 p-0.5 text-xs"
                title="Удалить"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className={`flex items-center gap-3 text-[10px] ${color.meta} mb-2 flex-wrap`}>
          {startLabel && <span className="font-medium">{startLabel} —</span>}
          <span>{projects.length} проект{projects.length === 1 ? "" : projects.length < 5 ? "а" : "ов"}</span>
        </div>

        {/* Projects inside this PlanItem — collapsible */}
        {!collapsed && (
          <>
            <SortableContext items={projectIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {projects.map((project) => (
                  <CompactProjectCard
                    key={project.id}
                    project={project}
                    onEdit={() => onEditProject(project)}
                    onDelete={() => {
                      if (window.confirm("Удалить проект?")) onDeleteProject(project.id);
                    }}
                    showInline
                    onEditStage={onEditStage}
                    onDeleteStage={onDeleteStage}
                    onAddStage={onAddStage}
                    onEditTask={onEditTask}
                    onAddTask={onAddTask}
                  />
                ))}
              </div>
            </SortableContext>

            <button
              onClick={onAddProject}
              className={`w-full mt-2 py-1.5 border border-dashed rounded-lg text-[11px] transition-colors bg-white/50 hover:bg-white/70 ${color.meta} border-current/30`}
            >
              + Добавить проект
            </button>
          </>
        )}
      </div>
    </div>
  );
}
