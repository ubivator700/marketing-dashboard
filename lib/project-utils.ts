import type { Project, Stage, ProjectTask, Plan, PlanItem } from "@/types/dashboard";

// ─── Completion calculation ───────────────────────────────────────

export function calcStageCompletion(stage: Stage): number {
  if (stage.tasks.length === 0) return 0;
  const done = stage.tasks.filter((t) => t.status === "done").length;
  return Math.round((done / stage.tasks.length) * 100);
}

export function calcProjectCompletion(project: Project): number {
  const allTasks = project.stages.flatMap((s) => s.tasks);
  if (allTasks.length === 0) return 0;
  const done = allTasks.filter((t) => t.status === "done").length;
  return Math.round((done / allTasks.length) * 100);
}

// ─── Project CRUD ─────────────────────────────────────────────────

export function addProject(projects: Project[], project: Project): Project[] {
  return [...projects, project];
}

export function updateProject(
  projects: Project[],
  projectId: number,
  updates: Partial<Omit<Project, "id" | "stages">>
): Project[] {
  return projects.map((p) =>
    p.id !== projectId ? p : { ...p, ...updates }
  );
}

export function deleteProject(projects: Project[], projectId: number): Project[] {
  return projects.filter((p) => p.id !== projectId);
}

export function reorderProjects(projects: Project[], orderedIds: number[]): Project[] {
  return orderedIds.map((id, idx) => {
    const project = projects.find((p) => p.id === id)!;
    return { ...project, priority: idx + 1 };
  });
}

// ─── Stage CRUD ───────────────────────────────────────────────────

export function addStage(projects: Project[], projectId: number, stage: Stage): Project[] {
  return projects.map((p) =>
    p.id !== projectId ? p : { ...p, stages: [...p.stages, stage] }
  );
}

export function updateStage(
  projects: Project[],
  projectId: number,
  stageId: number,
  updates: Partial<Omit<Stage, "id" | "projectId" | "tasks">>
): Project[] {
  return projects.map((p) =>
    p.id !== projectId
      ? p
      : {
          ...p,
          stages: p.stages.map((s) =>
            s.id !== stageId ? s : { ...s, ...updates }
          ),
        }
  );
}

export function deleteStage(projects: Project[], projectId: number, stageId: number): Project[] {
  return projects.map((p) =>
    p.id !== projectId
      ? p
      : { ...p, stages: p.stages.filter((s) => s.id !== stageId) }
  );
}

// ─── ProjectTask CRUD ─────────────────────────────────────────────

export function addProjectTask(
  projects: Project[],
  projectId: number,
  stageId: number,
  task: ProjectTask
): Project[] {
  return projects.map((p) =>
    p.id !== projectId
      ? p
      : {
          ...p,
          stages: p.stages.map((s) =>
            s.id !== stageId ? s : { ...s, tasks: [...s.tasks, task] }
          ),
        }
  );
}

export function updateProjectTask(
  projects: Project[],
  projectId: number,
  stageId: number,
  taskId: number,
  updates: Partial<Omit<ProjectTask, "id" | "stageId" | "projectId">>
): Project[] {
  return projects.map((p) =>
    p.id !== projectId
      ? p
      : {
          ...p,
          stages: p.stages.map((s) =>
            s.id !== stageId
              ? s
              : {
                  ...s,
                  tasks: s.tasks.map((t) =>
                    t.id !== taskId ? t : { ...t, ...updates }
                  ),
                }
          ),
        }
  );
}

export function deleteProjectTask(
  projects: Project[],
  projectId: number,
  stageId: number,
  taskId: number
): Project[] {
  return projects.map((p) =>
    p.id !== projectId
      ? p
      : {
          ...p,
          stages: p.stages.map((s) =>
            s.id !== stageId
              ? s
              : { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) }
          ),
        }
  );
}

// ─── Plan CRUD ───────────────────────────────────────────────────

export function addPlan(plans: Plan[], plan: Plan): Plan[] {
  return [...plans, plan];
}

export function updatePlan(
  plans: Plan[],
  planId: number,
  updates: Partial<Omit<Plan, "id" | "items">>
): Plan[] {
  return plans.map((p) =>
    p.id !== planId ? p : { ...p, ...updates }
  );
}

export function deletePlan(plans: Plan[], planId: number): Plan[] {
  return plans.filter((p) => p.id !== planId);
}

export function reorderPlans(plans: Plan[], orderedIds: number[]): Plan[] {
  return orderedIds.map((id, idx) => {
    const plan = plans.find((p) => p.id === id)!;
    return { ...plan, sortOrder: idx + 1 };
  });
}

// ─── PlanItem CRUD ───────────────────────────────────────────────

export function addPlanItem(plans: Plan[], planId: number, item: PlanItem): Plan[] {
  return plans.map((p) =>
    p.id !== planId ? p : { ...p, items: [...p.items, item] }
  );
}

export function updatePlanItem(
  plans: Plan[],
  planId: number,
  itemId: number,
  updates: Partial<Omit<PlanItem, "id" | "planId">>
): Plan[] {
  return plans.map((p) =>
    p.id !== planId
      ? p
      : {
          ...p,
          items: p.items.map((i) =>
            i.id !== itemId ? i : { ...i, ...updates }
          ),
        }
  );
}

export function deletePlanItem(plans: Plan[], planId: number, itemId: number): Plan[] {
  return plans.map((p) =>
    p.id !== planId
      ? p
      : { ...p, items: p.items.filter((i) => i.id !== itemId) }
  );
}

export function reorderPlanItems(plans: Plan[], planId: number, orderedIds: number[]): Plan[] {
  return plans.map((p) => {
    if (p.id !== planId) return p;
    const newItems = orderedIds.map((id, idx) => {
      const item = p.items.find((i) => i.id === id)!;
      return { ...item, sortOrder: idx + 1 };
    });
    return { ...p, items: newItems };
  });
}
