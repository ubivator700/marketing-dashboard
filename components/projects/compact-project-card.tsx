"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import type { Project } from "@/types/dashboard";
import { calcProjectCompletion } from "@/lib/project-utils";

interface CompactProjectCardProps {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CompactProjectCard({ project, onEdit, onDelete }: CompactProjectCardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center gap-2 group hover:shadow-sm transition-shadow"
    >
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
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <span>{startLabel ? `${startLabel} — ${deadlineLabel}` : deadlineLabel}</span>
          {project.responsible && (
            <>
              <span>·</span>
              <span>{project.responsible}</span>
            </>
          )}
          <span>·</span>
          <span>{project.stages.length} этап{project.stages.length === 1 ? "" : project.stages.length < 5 ? "а" : "ов"}</span>
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
  );
}
