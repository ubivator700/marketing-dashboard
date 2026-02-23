"use client";

import type { ProjectTask } from "@/types/dashboard";
import { projectTaskStatusLabels, projectTaskStatusColors } from "@/lib/projects-data";

interface ProjectTaskRowProps {
  task: ProjectTask;
  onEdit: (task: ProjectTask) => void;
}

export default function ProjectTaskRow({ task, onEdit }: ProjectTaskRowProps) {
  return (
    <button
      onClick={() => onEdit(task)}
      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${projectTaskStatusColors[task.status]}`}>
        {projectTaskStatusLabels[task.status]}
      </span>
      <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{task.name}</span>
      <span className="text-xs text-gray-400 flex-shrink-0">{task.assignee}</span>
      <span className="text-xs text-gray-400 flex-shrink-0">
        {new Date(task.deadline + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
      </span>
    </button>
  );
}
