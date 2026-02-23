import type { Department, DepartmentId, Goal, Task } from "@/types/dashboard";

// ─── Goals ───────────────────────────────────────────────────────────

export function updateGoal(
  departments: Department[],
  deptId: DepartmentId,
  goalId: number,
  updates: Partial<Omit<Goal, "id">>
): Department[] {
  return departments.map((dept) =>
    dept.id !== deptId
      ? dept
      : {
          ...dept,
          goals: dept.goals.map((g) =>
            g.id !== goalId ? g : { ...g, ...updates }
          ),
        }
  );
}

export function addGoal(
  departments: Department[],
  deptId: DepartmentId,
  goal: Goal
): Department[] {
  return departments.map((dept) =>
    dept.id !== deptId ? dept : { ...dept, goals: [...dept.goals, goal] }
  );
}

export function deleteGoal(
  departments: Department[],
  deptId: DepartmentId,
  goalId: number
): Department[] {
  return departments.map((dept) =>
    dept.id !== deptId
      ? dept
      : { ...dept, goals: dept.goals.filter((g) => g.id !== goalId) }
  );
}

// ─── Tasks ───────────────────────────────────────────────────────────

export function updateTask(
  departments: Department[],
  deptId: DepartmentId,
  taskId: number,
  updates: Partial<Omit<Task, "id">>
): Department[] {
  return departments.map((dept) =>
    dept.id !== deptId
      ? dept
      : {
          ...dept,
          tasks: dept.tasks.map((t) =>
            t.id !== taskId ? t : { ...t, ...updates }
          ),
        }
  );
}

export function addTask(
  departments: Department[],
  deptId: DepartmentId,
  task: Task
): Department[] {
  return departments.map((dept) =>
    dept.id !== deptId ? dept : { ...dept, tasks: [...dept.tasks, task] }
  );
}

export function deleteTask(
  departments: Department[],
  deptId: DepartmentId,
  taskId: number
): Department[] {
  return departments.map((dept) =>
    dept.id !== deptId
      ? dept
      : { ...dept, tasks: dept.tasks.filter((t) => t.id !== taskId) }
  );
}
