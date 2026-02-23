import type { Project, Stage, ProjectTask } from "@/types/dashboard";

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
