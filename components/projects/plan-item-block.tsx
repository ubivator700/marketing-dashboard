"use client";

import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { PlanItem, Project } from "@/types/dashboard";
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
}

export default function PlanItemBlock({
  item,
  projects,
  onEdit,
  onDelete,
  onAddProject,
  onEditProject,
  onDeleteProject,
}: PlanItemBlockProps) {
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

  const projectIds = projects.map((p) => `project-${p.id}`);

  return (
    <div
      ref={(node) => {
        setSortableRef(node);
        setDroppableRef(node);
      }}
      style={style}
      className={`relative rounded-xl border ${color.border} ${color.bg} overflow-hidden transition-all ${
        isOver ? "ring-2 ring-indigo-400 ring-offset-1" : ""
      }`}
    >
      {/* Color stripe on left */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${color.stripe}`} />

      <div className="pl-4 pr-3 py-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2 group">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className={`mt-0.5 ${color.meta} opacity-50 hover:opacity-80 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none`}
              title="Перетащить"
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
            <div className="min-w-0">
              <h4 className={`text-sm font-bold ${color.text} leading-tight`}>{item.name}</h4>
              {item.result && (
                <p className={`text-[11px] ${color.meta} mt-0.5 line-clamp-2`}>{item.result}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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

        {/* Meta */}
        <div className={`flex items-center gap-3 text-[10px] ${color.meta} mb-2`}>
          <span>{startLabel ? `${startLabel} — ${deadlineLabel}` : `Дедлайн: ${deadlineLabel}`}</span>
          {item.responsible && (
            <>
              <span>·</span>
              <span className="font-medium">{item.responsible}</span>
            </>
          )}
          <span>·</span>
          <span>{projects.length} проект{projects.length === 1 ? "" : projects.length < 5 ? "а" : "ов"}</span>
        </div>

        {/* Projects inside this PlanItem */}
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
              />
            ))}
          </div>
        </SortableContext>

        {/* Add project button */}
        <button
          onClick={onAddProject}
          className={`w-full mt-2 py-1.5 border border-dashed rounded-lg text-[11px] transition-colors bg-white/50 hover:bg-white/70 ${color.meta} border-current/30`}
        >
          + Добавить проект
        </button>
      </div>
    </div>
  );
}
