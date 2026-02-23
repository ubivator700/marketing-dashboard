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
                  <button
                    key={`${task.dept.id}-${task.id}`}
                    onClick={() =>
                      setEditing({
                        task,
                        deptId: task.dept.id,
                        deptName: task.dept.name,
                        deptIcon: task.dept.icon,
                      })
                    }
                    className="w-full text-left bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${priorityDots[task.priority]}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{task.text}</p>
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
                      </div>
                    </div>
                  </button>
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
