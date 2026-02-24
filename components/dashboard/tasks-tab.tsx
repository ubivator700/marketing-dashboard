"use client";

import { useState } from "react";
import type { Department, DepartmentId, Task, TaskStatus, TaskWithDepartment } from "@/types/dashboard";
import { statusLabels, priorityLabels, priorityDots } from "@/lib/data";
import DepartmentFilter from "./department-filter";
import TaskEditModal from "./task-edit-modal";

interface TasksTabProps {
  departments: Department[];
  selectedDept: DepartmentId | null;
  onDeptSelect: (deptId: DepartmentId | null) => void;
  onTaskSave: (deptId: DepartmentId, task: Task) => void;
  onTaskDelete: (deptId: DepartmentId, taskId: number) => void;
}

interface EditingTask {
  task: Task | null;
  deptId: DepartmentId;
  deptName: string;
  deptIcon: string;
  initialStatus?: TaskStatus;
}

const columns: TaskStatus[] = ["todo", "in_progress", "done"];

export default function TasksTab({
  departments,
  selectedDept,
  onDeptSelect,
  onTaskSave,
  onTaskDelete,
}: TasksTabProps) {
  const [editing, setEditing] = useState<EditingTask | null>(null);

  const handleSave = (deptId: DepartmentId, task: Task) => {
    onTaskSave(deptId, task);
    setEditing(null);
  };

  const handleDelete = (deptId: DepartmentId, taskId: number) => {
    onTaskDelete(deptId, taskId);
    setEditing(null);
  };

  // For "create" we need to pick a department. Use selectedDept or first available.
  const defaultDept = departments.find((d) => d.id === selectedDept) || departments[0];

  return (
    <div className="space-y-6">
      <DepartmentFilter
        departments={departments}
        selectedDept={selectedDept}
        onSelect={onDeptSelect}
        allLabel="Все"
      />

      {/* Kanban board */}
      <div className="grid md:grid-cols-3 gap-4">
        {columns.map((status) => {
          const filtered: TaskWithDepartment[] = departments
            .filter((d) => !selectedDept || d.id === selectedDept)
            .flatMap((d) =>
              d.tasks
                .filter((t) => t.status === status)
                .map((t) => ({ ...t, dept: d }))
            );
          return (
            <div
              key={status}
              className="bg-gray-100 rounded-xl p-4 min-h-[300px]"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700">
                  {statusLabels[status]}
                </h3>
                <span className="text-xs bg-white text-gray-500 px-2 py-0.5 rounded-full">
                  {filtered.length}
                </span>
              </div>
              <div className="space-y-2">
                {filtered.map((task) => (
                  <div
                    key={`${task.dept.id}-${task.id}`}
                    className="w-full text-left bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newStatus = task.status === "done" ? "todo" : "done";
                          const { dept: _, ...plain } = task;
                          onTaskSave(task.dept.id, { ...plain, status: newStatus });
                        }}
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
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
                          setEditing({
                            task,
                            deptId: task.dept.id,
                            deptName: task.dept.name,
                            deptIcon: task.dept.icon,
                          })
                        }
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <p className={`text-sm text-gray-800 ${task.status === "done" ? "line-through text-gray-400" : ""}`}>{task.text}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: task.dept.color + "15",
                              color: task.dept.color,
                            }}
                          >
                            {task.dept.person}
                          </span>
                          <span className="text-xs text-gray-400">
                            {priorityLabels[task.priority]}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add task to this column */}
              <button
                onClick={() =>
                  setEditing({
                    task: null,
                    deptId: defaultDept.id,
                    deptName: defaultDept.name,
                    deptIcon: defaultDept.icon,
                    initialStatus: status,
                  })
                }
                className="w-full mt-2 py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
              >
                + Задача
              </button>
            </div>
          );
        })}
      </div>

      {/* Edit/Create modal */}
      {editing && (
        <TaskEditModal
          task={editing.task}
          deptId={editing.deptId}
          deptName={editing.deptName}
          deptIcon={editing.deptIcon}
          onSave={handleSave}
          onDelete={editing.task ? handleDelete : undefined}
          onClose={() => setEditing(null)}
          initialStatus={editing.initialStatus}
        />
      )}
    </div>
  );
}
