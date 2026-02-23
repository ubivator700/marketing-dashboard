"use client";

import { useState } from "react";
import type { Stage, ProjectTask } from "@/types/dashboard";
import { calcStageCompletion } from "@/lib/project-utils";
import ProgressBar from "@/components/dashboard/progress-bar";
import ProjectTaskRow from "./project-task-row";

interface StageCardProps {
  stage: Stage;
  onEditStage: (stage: Stage) => void;
  onDeleteStage: (stageId: number) => void;
  onEditTask: (task: ProjectTask) => void;
  onAddTask: (stageId: number) => void;
}

export default function StageCard({
  stage,
  onEditStage,
  onDeleteStage,
  onEditTask,
  onAddTask,
}: StageCardProps) {
  const [expanded, setExpanded] = useState(false);
  const completion = calcStageCompletion(stage);

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      {/* Stage header */}
      <div className="px-4 py-3 bg-gray-50/50 flex items-center gap-3 group">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600 transition-colors text-sm flex-shrink-0"
        >
          {expanded ? "▾" : "▸"}
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-gray-800">{stage.name}</h4>
            <span className="text-xs text-gray-400">
              {new Date(stage.deadline + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
            </span>
          </div>
          {stage.result && (
            <p className="text-xs text-gray-500 mt-0.5">Результат: {stage.result}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-24">
            <ProgressBar progress={completion} color="#6366f1" height="h-1.5" />
          </div>
          <span className="text-xs font-medium text-indigo-600 w-8 text-right">{completion}%</span>
          <button
            onClick={() => onEditStage(stage)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-600 text-sm"
            title="Редактировать этап"
          >
            ✏️
          </button>
          <button
            onClick={() => {
              if (window.confirm("Удалить этап и все его задачи?")) onDeleteStage(stage.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 text-sm"
            title="Удалить этап"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Tasks (expanded) */}
      {expanded && (
        <div className="px-4 py-2 space-y-0.5">
          {stage.tasks.length === 0 && (
            <p className="text-xs text-gray-400 py-2 text-center">Нет задач</p>
          )}
          {stage.tasks.map((task) => (
            <ProjectTaskRow key={task.id} task={task} onEdit={onEditTask} />
          ))}
          <button
            onClick={() => onAddTask(stage.id)}
            className="w-full py-2 mt-1 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
          >
            + Новая задача
          </button>
        </div>
      )}
    </div>
  );
}
