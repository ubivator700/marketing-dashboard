"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Plan, PlanItem, Project } from "@/types/dashboard";
import PlanItemBlock from "./plan-item-block";

interface PlanBlockProps {
  plan: Plan;
  projectsByItem: Map<number, Project[]>;
  onEdit: () => void;
  onDelete: () => void;
  onAddItem: () => void;
  onEditItem: (item: PlanItem) => void;
  onDeleteItem: (itemId: number) => void;
  onAddProjectToItem: (itemId: number) => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (projectId: number) => void;
  onEditStage?: (projectId: number, stage: import("@/types/dashboard").Stage) => void;
  onDeleteStage?: (projectId: number, stageId: number) => void;
  onAddStage?: (projectId: number) => void;
  onEditTask?: (projectId: number, stageId: number, task: import("@/types/dashboard").ProjectTask) => void;
  onAddTask?: (projectId: number, stageId: number) => void;
}

export default function PlanBlock({
  plan,
  projectsByItem,
  onEdit,
  onDelete,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onAddProjectToItem,
  onEditProject,
  onDeleteProject,
  onEditStage,
  onDeleteStage,
  onAddStage,
  onEditTask,
  onAddTask,
}: PlanBlockProps) {
  const [collapsed, setCollapsed] = useState(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `plan-${plan.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const startLabel = plan.startDate
    ? new Date(plan.startDate + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
    : null;
  const deadlineLabel = new Date(plan.deadline + "T00:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Calculate total projects count
  const totalProjects = plan.items.reduce((sum, item) => sum + (projectsByItem.get(item.id)?.length || 0), 0);

  const sortedItems = [...plan.items].sort((a, b) => a.sortOrder - b.sortOrder);
  const itemIds = sortedItems.map((i) => `planitem-${i.id}`);

  // Days left until deadline
  const now = new Date();
  const deadlineDate = new Date(plan.deadline + "T00:00:00");
  const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Check if all tasks in all non-cancelled projects under this plan are done
  const allPlanTasks = plan.items.filter((i) => !i.cancelled).flatMap((item) =>
    (projectsByItem.get(item.id) || []).filter((p) => !p.cancelled).flatMap((p) => p.stages.filter((s) => !s.cancelled).flatMap((s) => s.tasks.filter((t) => !t.cancelled)))
  );
  const isPlanCancelled = !!plan.cancelled;
  const isPlanCompleted = !isPlanCancelled && allPlanTasks.length > 0 && allPlanTasks.every((t) => t.status === "done");
  const isPlanOverdue = !isPlanCancelled && !isPlanCompleted && daysLeft < 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${
        isPlanCancelled ? "bg-gray-100 border-gray-300 opacity-60" : isPlanCompleted ? "bg-green-50 border-green-200" : isPlanOverdue ? "bg-red-50 border-red-200" : "bg-white border-gray-100"
      }`}
    >
      {/* Plan header */}
      <div
        className="px-5 py-4 flex items-start gap-3 group border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-white cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
          title="Перетащить план"
          onClick={(e) => e.stopPropagation()}
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

        {/* Collapse chevron */}
        <button
          className="mt-1.5 text-gray-400 hover:text-gray-600 flex-shrink-0 transition-transform"
          onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
        >
          <svg
            className={`w-4 h-4 transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className={`text-base font-bold leading-tight flex items-center gap-2 ${isPlanCancelled ? "text-gray-400 line-through" : "text-gray-900"}`}>
                <span className={isPlanCancelled ? "text-gray-400" : "text-indigo-500"}>📋</span>
                {plan.name}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                <span className="text-gray-400">
                  {plan.items.length} пункт{plan.items.length === 1 ? "" : plan.items.length < 5 ? "а" : "ов"} · {totalProjects} проект{totalProjects === 1 ? "" : totalProjects < 5 ? "а" : "ов"}
                </span>
              </div>
            </div>
            {/* Right side: deadline + responsible — large and prominent */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <div className={`text-sm font-bold ${isPlanCancelled ? "text-gray-400" : isPlanCompleted ? "text-green-600" : isPlanOverdue ? "text-red-600" : daysLeft <= 3 ? "text-amber-600" : "text-gray-700"}`}>
                  {deadlineLabel}
                </div>
                <div className={`text-xs font-semibold ${isPlanCancelled ? "text-gray-400" : isPlanCompleted ? "text-green-500" : isPlanOverdue ? "text-red-500" : daysLeft <= 3 ? "text-amber-500" : "text-gray-400"}`}>
                  {isPlanCancelled ? "Отменён" : isPlanCompleted ? "Выполнен" : isPlanOverdue ? "просрочен" : `${daysLeft} дн.`}
                </div>
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={onEdit}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-600 p-1"
                  title="Редактировать план"
                >
                  ✏️
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Удалить план и все его пункты?")) onDelete();
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1"
                  title="Удалить план"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Plan items — collapsible */}
      {!collapsed && (
        <div className="px-5 py-4">
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sortedItems.map((item) => (
                <PlanItemBlock
                  key={item.id}
                  item={item}
                  projects={projectsByItem.get(item.id) || []}
                  parentCancelled={isPlanCancelled}
                  onEdit={() => onEditItem(item)}
                  onDelete={() => onDeleteItem(item.id)}
                  onAddProject={() => onAddProjectToItem(item.id)}
                  onEditProject={onEditProject}
                  onDeleteProject={onDeleteProject}
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
            onClick={onAddItem}
            className="w-full mt-3 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
          >
            + Добавить пункт
          </button>
        </div>
      )}
    </div>
  );
}
