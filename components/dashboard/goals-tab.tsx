"use client";

import { useState } from "react";
import type { Department, DepartmentId, Goal } from "@/types/dashboard";
import DepartmentFilter from "./department-filter";
import ProgressBar from "./progress-bar";
import GoalEditModal from "./goal-edit-modal";

interface GoalsTabProps {
  departments: Department[];
  selectedDept: DepartmentId | null;
  onDeptSelect: (deptId: DepartmentId | null) => void;
  onGoalSave: (deptId: DepartmentId, goal: Goal) => void;
  onGoalDelete: (deptId: DepartmentId, goalId: number) => void;
}

interface EditingGoal {
  goal: Goal | null;
  deptId: DepartmentId;
  deptName: string;
  deptIcon: string;
}

export default function GoalsTab({
  departments,
  selectedDept,
  onDeptSelect,
  onGoalSave,
  onGoalDelete,
}: GoalsTabProps) {
  const [editing, setEditing] = useState<EditingGoal | null>(null);

  const handleSave = (deptId: DepartmentId, goal: Goal) => {
    onGoalSave(deptId, goal);
    setEditing(null);
  };

  const handleDelete = (deptId: DepartmentId, goalId: number) => {
    onGoalDelete(deptId, goalId);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <DepartmentFilter
        departments={departments}
        selectedDept={selectedDept}
        onSelect={onDeptSelect}
        allLabel="Все подотделы"
      />
      {departments
        .filter((d) => !selectedDept || d.id === selectedDept)
        .map((dept) => (
          <div
            key={dept.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div
              className="px-5 py-4 border-b border-gray-100"
              style={{ borderLeftWidth: 4, borderLeftColor: dept.color }}
            >
              <div className="flex items-center gap-2">
                <span>{dept.icon}</span>
                <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                <span className="text-sm text-gray-400">— {dept.person}</span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {dept.goals.map((goal) => (
                <div key={goal.id} className="space-y-2 group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">
                        {goal.text}
                      </p>
                      <span className="text-xs text-gray-400">
                        KPI: {goal.kpi}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setEditing({
                            goal,
                            deptId: dept.id,
                            deptName: dept.name,
                            deptIcon: dept.icon,
                          })
                        }
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-600 text-sm"
                        title="Редактировать"
                      >
                        ✏️
                      </button>
                      <span
                        className="text-sm font-bold ml-1"
                        style={{ color: dept.color }}
                      >
                        {goal.progress}%
                      </span>
                    </div>
                  </div>
                  <ProgressBar
                    progress={goal.progress}
                    color={dept.color}
                    height="h-2.5"
                  />
                </div>
              ))}

              {/* Add goal button */}
              <button
                onClick={() =>
                  setEditing({
                    goal: null,
                    deptId: dept.id,
                    deptName: dept.name,
                    deptIcon: dept.icon,
                  })
                }
                className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
              >
                + Новая цель
              </button>
            </div>
          </div>
        ))}

      {/* Edit/Create modal */}
      {editing && (
        <GoalEditModal
          goal={editing.goal}
          deptId={editing.deptId}
          deptName={editing.deptName}
          deptIcon={editing.deptIcon}
          onSave={handleSave}
          onDelete={editing.goal ? handleDelete : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
