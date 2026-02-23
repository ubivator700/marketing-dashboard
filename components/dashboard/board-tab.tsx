"use client";

import { useState, useMemo } from "react";
import type {
  Department,
  DepartmentId,
  Goal,
  Task,
  TaskStatus,
  TaskPriority,
  TaskWithDepartment,
} from "@/types/dashboard";
import { statusLabels, statusColors, priorityLabels, priorityDots } from "@/lib/data";
import DepartmentFilter from "./department-filter";
import ProgressBar from "./progress-bar";
import GoalEditModal from "./goal-edit-modal";
import TaskEditModal from "./task-edit-modal";

interface BoardTabProps {
  departments: Department[];
  selectedDept: DepartmentId | null;
  onDeptSelect: (deptId: DepartmentId | null) => void;
  onGoalSave: (deptId: DepartmentId, goal: Goal) => void;
  onTaskSave: (deptId: DepartmentId, task: Task) => void;
}

interface ProjectCard extends Goal {
  dept: Department;
  relatedTasks: Task[];
}

interface EditingGoal {
  goal: Goal;
  deptId: DepartmentId;
  deptName: string;
  deptIcon: string;
}

interface EditingTask {
  task: Task;
  deptId: DepartmentId;
  deptName: string;
  deptIcon: string;
}

const statusOrder: Record<TaskStatus, number> = { in_progress: 0, todo: 1, done: 2 };
const priorityOrder: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

export default function BoardTab({
  departments,
  selectedDept,
  onDeptSelect,
  onGoalSave,
  onTaskSave,
}: BoardTabProps) {
  const [editingGoal, setEditingGoal] = useState<EditingGoal | null>(null);
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null);

  const filteredDepts = useMemo(
    () => departments.filter((d) => !selectedDept || d.id === selectedDept),
    [departments, selectedDept]
  );

  // Goals as project cards
  const projects: ProjectCard[] = useMemo(
    () =>
      filteredDepts.flatMap((dept) =>
        dept.goals.map((goal) => ({
          ...goal,
          dept,
          relatedTasks: dept.tasks.filter(
            (t) => t.priority === "high" || t.status === "in_progress"
          ),
        }))
      ),
    [filteredDepts]
  );

  // Key tasks: high priority + in progress
  const keyTasks: TaskWithDepartment[] = useMemo(() => {
    const tasks = filteredDepts.flatMap((dept) =>
      dept.tasks
        .filter((t) => t.priority === "high" || t.status === "in_progress")
        .map((t) => ({ ...t, dept }))
    );

    // Deduplicate (a task can be both high priority AND in_progress)
    const seen = new Set<string>();
    const unique = tasks.filter((t) => {
      const key = `${t.dept.id}-${t.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    unique.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;
      return statusOrder[a.status] - statusOrder[b.status];
    });

    return unique;
  }, [filteredDepts]);

  const handleGoalSave = (deptId: DepartmentId, goal: Goal) => {
    onGoalSave(deptId, goal);
    setEditingGoal(null);
  };

  const handleTaskSave = (deptId: DepartmentId, task: Task) => {
    onTaskSave(deptId, task);
    setEditingTask(null);
  };

  return (
    <div className="space-y-8">
      <DepartmentFilter
        departments={departments}
        selectedDept={selectedDept}
        onSelect={onDeptSelect}
        allLabel="Все подотделы"
      />

      {/* Section 1: Active Projects & Goals */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Активные проекты и цели
          </h2>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
            {projects.length}
          </span>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <div
              key={`${project.dept.id}-${project.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group"
              style={{ borderLeft: `4px solid ${project.dept.color}` }}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{project.dept.icon}</span>
                    <span className="text-sm font-medium text-gray-700">
                      {project.dept.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      — {project.dept.person}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setEditingGoal({
                        goal: { id: project.id, text: project.text, progress: project.progress, kpi: project.kpi },
                        deptId: project.dept.id,
                        deptName: project.dept.name,
                        deptIcon: project.dept.icon,
                      })
                    }
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-600 text-sm"
                    title="Редактировать"
                  >
                    ✏️
                  </button>
                </div>
                <h3 className="font-bold text-gray-900 text-base leading-tight">
                  {project.text}
                </h3>
                <span className="text-xs text-gray-400 mt-1 block">
                  KPI: {project.kpi}
                </span>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1">
                    <ProgressBar
                      progress={project.progress}
                      color={project.dept.color}
                      height="h-3"
                    />
                  </div>
                  <span
                    className="text-sm font-bold"
                    style={{ color: project.dept.color }}
                  >
                    {project.progress}%
                  </span>
                </div>

                {/* Related tasks */}
                {project.relatedTasks.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
                    {project.relatedTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityDots[task.priority]}`}
                          />
                          <span className="text-xs text-gray-700 truncate">
                            {task.text}
                          </span>
                        </div>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${statusColors[task.status]}`}
                        >
                          {statusLabels[task.status]}
                        </span>
                      </div>
                    ))}
                    {project.relatedTasks.length > 3 && (
                      <span className="text-xs text-gray-400">
                        +{project.relatedTasks.length - 3} ещё
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Key Tasks */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Ключевые задачи
          </h2>
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
            {keyTasks.length}
          </span>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {keyTasks.map((task) => (
            <button
              key={`${task.dept.id}-${task.id}`}
              onClick={() =>
                setEditingTask({
                  task,
                  deptId: task.dept.id,
                  deptName: task.dept.name,
                  deptIcon: task.dept.icon,
                })
              }
              className={`text-left bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer ${
                task.priority === "high" ? "ring-1 ring-red-100" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${priorityDots[task.priority]}`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium text-gray-900 ${
                      task.priority === "high" ? "text-base" : "text-sm"
                    }`}
                  >
                    {task.text}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: task.dept.color + "15",
                        color: task.dept.color,
                      }}
                    >
                      {task.dept.icon} {task.dept.person}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${statusColors[task.status]}`}
                    >
                      {statusLabels[task.status]}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${priorityDots[task.priority]}`}
                      />
                      {priorityLabels[task.priority]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Срок:{" "}
                    {new Date(task.dueDate + "T00:00:00").toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Goal edit modal */}
      {editingGoal && (
        <GoalEditModal
          goal={editingGoal.goal}
          deptId={editingGoal.deptId}
          deptName={editingGoal.deptName}
          deptIcon={editingGoal.deptIcon}
          onSave={handleGoalSave}
          onClose={() => setEditingGoal(null)}
        />
      )}

      {/* Task edit modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask.task}
          deptId={editingTask.deptId}
          deptName={editingTask.deptName}
          deptIcon={editingTask.deptIcon}
          onSave={handleTaskSave}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
