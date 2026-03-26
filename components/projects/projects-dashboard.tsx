"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { Project, Stage, ProjectTask, StandaloneTask, RecurringTask, Plan, PlanItem } from "@/types/dashboard";
import { useAppContext } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import {
  reorderProjects,
  addProject,
  updateProject,
  deleteProject as removeProject,
  addStage,
  updateStage,
  deleteStage as removeStage,
  addProjectTask,
  updateProjectTask,
  deleteProjectTask as removeProjectTask,
  addPlan,
  updatePlan,
  deletePlan as removePlan,
  reorderPlans,
  addPlanItem,
  updatePlanItem,
  deletePlanItem as removePlanItem,
  reorderPlanItems,
  reorderStages,
} from "@/lib/project-utils";

import ProjectEditModal from "./project-edit-modal";
import StageEditModal from "./stage-edit-modal";
import ProjectTaskEditModal from "./project-task-edit-modal";
import StandaloneTasksTab, { StandaloneTaskModal } from "./standalone-tasks-tab";
import RecurringTasksTab from "./recurring-tasks-tab";
import ProjectsCalendarTab from "./projects-calendar-tab";
import AllTasksTab from "./all-tasks-tab";
import PlanBlock from "./plan-block";
import PlanEditModal from "./plan-edit-modal";
import PlanItemEditModal from "./plan-item-edit-modal";
import CompactProjectCard from "./compact-project-card";
import KanbanBoard from "./kanban-board";

// ─── Modal state types ───
interface EditProjectModal { project: Project | null; planItemId?: number | null }
interface EditStageModal { stage: Stage | null; projectId: number; projectName: string }
interface EditTaskModal { task: ProjectTask | null; projectId: number; stageId: number; stageName: string }
interface EditPlanModal { plan: Plan | null }
interface EditPlanItemModal { item: PlanItem | null; planId: number }

type ProjectsTabId = "projects" | "standalone" | "recurring" | "calendar" | "all-tasks" | "kanban";

// ─── Standalone droppable zone ───
function StandaloneDropZone({ children, isEmpty }: { children: React.ReactNode; isEmpty: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "standalone-zone" });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border-2 border-dashed transition-all p-4 ${
        isOver
          ? "border-indigo-400 bg-indigo-50/50"
          : isEmpty
            ? "border-gray-200 bg-gray-50/50"
            : "border-gray-200 bg-white"
      }`}
    >
      <h3 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
        <span className="text-gray-400">📦</span>
        Проекты без плана
      </h3>
      {children}
    </div>
  );
}

export default function ProjectsDashboard() {
  const { projects, setProjects, expenses, setExpenses, channels, employees, standaloneTasks, setStandaloneTasks, recurringTasks, setRecurringTasks, plans, setPlans } = useAppContext();
  const { user } = useAuth();

  // Prevent hydration mismatch from @dnd-kit attributes
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [tab, setTab] = useState<ProjectsTabId>("projects");

  // Employee filter — default to current user's employeeName
  const [filterEmployee, setFilterEmployee] = useState<string | "__all__">(user?.employeeName ?? "__all__");

  // All unique employee names from projects (responsible + task assignees)
  const allProjectEmployees = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      if (p.responsible) set.add(p.responsible);
      for (const s of p.stages) {
        for (const t of s.tasks) {
          if (t.assignee) set.add(t.assignee);
        }
      }
    }
    return [...set].sort();
  }, [projects]);

  // Filtered projects: show projects where employee is responsible or assigned to any task
  const filteredProjects = useMemo(() => {
    if (filterEmployee === "__all__") return projects;
    return projects.filter((p) => {
      if (p.responsible === filterEmployee) return true;
      for (const s of p.stages) {
        for (const t of s.tasks) {
          if (t.assignee === filterEmployee) return true;
        }
      }
      return false;
    });
  }, [projects, filterEmployee]);

  // Modal states
  const [projectModal, setProjectModal] = useState<EditProjectModal | null>(null);
  const [stageModal, setStageModal] = useState<EditStageModal | null>(null);
  const [taskModal, setTaskModal] = useState<EditTaskModal | null>(null);
  const [planModal, setPlanModal] = useState<EditPlanModal | null>(null);
  const [planItemModal, setPlanItemModal] = useState<EditPlanItemModal | null>(null);
  const [standaloneEditTask, setStandaloneEditTask] = useState<StandaloneTask | null>(null);

  // Sorted data — uses filteredProjects for display
  const standaloneProjects = useMemo(
    () => filteredProjects.filter((p) => p.planItemId == null).sort((a, b) => a.priority - b.priority),
    [filteredProjects]
  );

  // Map: planItemId → Project[] (filtered)
  const projectsByPlanItem = useMemo(() => {
    const map = new Map<number, Project[]>();
    for (const p of filteredProjects) {
      if (p.planItemId != null) {
        if (!map.has(p.planItemId)) map.set(p.planItemId, []);
        map.get(p.planItemId)!.push(p);
      }
    }
    // Sort by priority
    for (const [key, arr] of map) {
      map.set(key, arr.sort((a, b) => a.priority - b.priority));
    }
    return map;
  }, [filteredProjects]);

  // Only show plans that have at least one filtered project
  const sortedPlans = useMemo(() => {
    const allSorted = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
    if (filterEmployee === "__all__") return allSorted;
    return allSorted.filter((plan) =>
      plan.items.some((item) => (projectsByPlanItem.get(item.id) ?? []).length > 0)
    );
  }, [plans, filterEmployee, projectsByPlanItem]);

  // Set of effectively cancelled project IDs (own cancelled OR parent plan/planItem cancelled)
  const effectivelyCancelledProjectIds = useMemo(() => {
    const cancelledItemIds = new Set<number>();
    for (const plan of plans) {
      for (const item of plan.items) {
        if (plan.cancelled || item.cancelled) cancelledItemIds.add(item.id);
      }
    }
    const set = new Set<number>();
    for (const p of projects) {
      if (p.cancelled || (p.planItemId != null && cancelledItemIds.has(p.planItemId))) {
        set.add(p.id);
      }
    }
    return set;
  }, [projects, plans]);

  // ─── DnD ───
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      // ─── Project drag ───
      if (activeId.startsWith("project-")) {
        const projectId = parseInt(activeId.replace("project-", ""), 10);

        // Dropped on a PlanItem container → bind to that PlanItem
        if (overId.startsWith("planitem-")) {
          const targetItemId = parseInt(overId.replace("planitem-", ""), 10);
          setProjects((prev) =>
            prev.map((p) => p.id !== projectId ? p : { ...p, planItemId: targetItemId })
          );
          return;
        }

        // Dropped on standalone zone → unbind
        if (overId === "standalone-zone") {
          setProjects((prev) =>
            prev.map((p) => p.id !== projectId ? p : { ...p, planItemId: null })
          );
          return;
        }

        // Dropped on another project → reorder within same container
        if (overId.startsWith("project-")) {
          const overProjectId = parseInt(overId.replace("project-", ""), 10);
          const activeProject = projects.find((p) => p.id === projectId);
          const overProject = projects.find((p) => p.id === overProjectId);
          if (!activeProject || !overProject) return;

          // If different containers, move to target's container
          if (activeProject.planItemId !== overProject.planItemId) {
            setProjects((prev) =>
              prev.map((p) => p.id !== projectId ? p : { ...p, planItemId: overProject.planItemId })
            );
            return;
          }

          // Same container → reorder
          const containerProjects = activeProject.planItemId == null
            ? standaloneProjects
            : (projectsByPlanItem.get(activeProject.planItemId) || []);

          const oldIndex = containerProjects.findIndex((p) => p.id === projectId);
          const newIndex = containerProjects.findIndex((p) => p.id === overProjectId);
          if (oldIndex === -1 || newIndex === -1) return;

          const reordered = arrayMove(containerProjects, oldIndex, newIndex);
          setProjects((prev) => {
            const ids = reordered.map((p) => p.id);
            return prev.map((p) => {
              const idx = ids.indexOf(p.id);
              if (idx === -1) return p;
              return { ...p, priority: idx + 1 };
            });
          });
          return;
        }
      }

      // ─── PlanItem drag (reorder within plan) ───
      if (activeId.startsWith("planitem-") && overId.startsWith("planitem-")) {
        const activeItemId = parseInt(activeId.replace("planitem-", ""), 10);
        const overItemId = parseInt(overId.replace("planitem-", ""), 10);

        // Find which plan they belong to
        for (const plan of plans) {
          const itemIds = plan.items.map((i) => i.id);
          if (itemIds.includes(activeItemId) && itemIds.includes(overItemId)) {
            const sortedItems = [...plan.items].sort((a, b) => a.sortOrder - b.sortOrder);
            const oldIdx = sortedItems.findIndex((i) => i.id === activeItemId);
            const newIdx = sortedItems.findIndex((i) => i.id === overItemId);
            if (oldIdx === -1 || newIdx === -1) return;
            const reordered = arrayMove(sortedItems, oldIdx, newIdx);
            setPlans(reorderPlanItems(plans, plan.id, reordered.map((i) => i.id)));
            return;
          }
        }
      }

      // ─── Stage drag ───
      if (activeId.startsWith("stage-")) {
        const activeStageId = parseInt(activeId.replace("stage-", ""), 10);

        // Find source project
        const sourceProject = projects.find((p) => p.stages.some((s) => s.id === activeStageId));
        if (!sourceProject) return;
        const draggedStage = sourceProject.stages.find((s) => s.id === activeStageId)!;

        // Dropped on another stage
        if (overId.startsWith("stage-")) {
          const overStageId = parseInt(overId.replace("stage-", ""), 10);
          const targetProject = projects.find((p) => p.stages.some((s) => s.id === overStageId));
          if (!targetProject) return;

          if (sourceProject.id === targetProject.id) {
            // Same project → reorder
            const oldIdx = sourceProject.stages.findIndex((s) => s.id === activeStageId);
            const newIdx = sourceProject.stages.findIndex((s) => s.id === overStageId);
            if (oldIdx === -1 || newIdx === -1) return;
            const reordered = arrayMove(sourceProject.stages, oldIdx, newIdx);
            setProjects(reorderStages(projects, sourceProject.id, reordered.map((s) => s.id)));
          } else {
            // Different project → move stage
            const overIdx = targetProject.stages.findIndex((s) => s.id === overStageId);
            const movedStage = { ...draggedStage, projectId: targetProject.id };
            // Update tasks projectId too
            movedStage.tasks = movedStage.tasks.map((t) => ({ ...t, projectId: targetProject.id }));

            setProjects((prev) =>
              prev.map((p) => {
                if (p.id === sourceProject.id) {
                  const newStages = p.stages.filter((s) => s.id !== activeStageId);
                  return { ...p, stages: newStages };
                }
                if (p.id === targetProject.id) {
                  const newStages = [...p.stages];
                  newStages.splice(overIdx, 0, movedStage);
                  return { ...p, stages: newStages };
                }
                return p;
              })
            );
          }
          return;
        }

        // Dropped on a project card → move to end of that project
        if (overId.startsWith("project-")) {
          const targetProjectId = parseInt(overId.replace("project-", ""), 10);
          if (targetProjectId === sourceProject.id) return;

          const movedStage = { ...draggedStage, projectId: targetProjectId };
          movedStage.tasks = movedStage.tasks.map((t) => ({ ...t, projectId: targetProjectId }));

          setProjects((prev) =>
            prev.map((p) => {
              if (p.id === sourceProject.id) {
                return { ...p, stages: p.stages.filter((s) => s.id !== activeStageId) };
              }
              if (p.id === targetProjectId) {
                return { ...p, stages: [...p.stages, movedStage] };
              }
              return p;
            })
          );
          return;
        }
      }

      // ─── Plan drag (reorder plans) ───
      if (activeId.startsWith("plan-") && overId.startsWith("plan-")) {
        const activePlanId = parseInt(activeId.replace("plan-", ""), 10);
        const overPlanId = parseInt(overId.replace("plan-", ""), 10);
        const oldIdx = sortedPlans.findIndex((p) => p.id === activePlanId);
        const newIdx = sortedPlans.findIndex((p) => p.id === overPlanId);
        if (oldIdx === -1 || newIdx === -1) return;
        const reordered = arrayMove(sortedPlans, oldIdx, newIdx);
        setPlans(reorderPlans(plans, reordered.map((p) => p.id)));
      }
    },
    [projects, plans, sortedPlans, standaloneProjects, projectsByPlanItem, setProjects, setPlans]
  );

  // ─── Plan CRUD ───
  const handlePlanSave = useCallback(
    (plan: Plan) => {
      setPlans((prev) => {
        const exists = prev.some((p) => p.id === plan.id);
        if (exists) return updatePlan(prev, plan.id, plan);
        return addPlan(prev, plan);
      });
      setPlanModal(null);
    },
    [setPlans]
  );

  const handlePlanDelete = useCallback(
    (planId: number) => {
      // Unbind all projects from this plan's items
      const plan = plans.find((p) => p.id === planId);
      if (plan) {
        const itemIds = new Set(plan.items.map((i) => i.id));
        setProjects((prev) =>
          prev.map((p) => itemIds.has(p.planItemId!) ? { ...p, planItemId: null } : p)
        );
      }
      setPlans((prev) => removePlan(prev, planId));
      setPlanModal(null);
    },
    [plans, setPlans, setProjects]
  );

  // ─── PlanItem CRUD ───
  const handlePlanItemSave = useCallback(
    (item: PlanItem) => {
      setPlans((prev) => {
        const plan = prev.find((p) => p.id === item.planId);
        if (!plan) return prev;
        const exists = plan.items.some((i) => i.id === item.id);
        if (exists) return updatePlanItem(prev, item.planId, item.id, item);
        return addPlanItem(prev, item.planId, item);
      });
      setPlanItemModal(null);
    },
    [setPlans]
  );

  const handlePlanItemDelete = useCallback(
    (planId: number, itemId: number) => {
      // Unbind projects
      setProjects((prev) =>
        prev.map((p) => p.planItemId === itemId ? { ...p, planItemId: null } : p)
      );
      setPlans((prev) => removePlanItem(prev, planId, itemId));
      setPlanItemModal(null);
    },
    [setPlans, setProjects]
  );

  // ─── Project CRUD ───
  const handleProjectSave = useCallback(
    (project: Project) => {
      setProjects((prev) => {
        const exists = prev.some((p) => p.id === project.id);
        if (exists) return updateProject(prev, project.id, project);
        return addProject(prev, project);
      });
      setProjectModal(null);
    },
    [setProjects]
  );

  const handleProjectDelete = useCallback(
    (projectId: number) => {
      setProjects((prev) => removeProject(prev, projectId));
      setExpenses((prev) =>
        prev.map((e) => (e.projectId === projectId ? { ...e, projectId: null } : e))
      );
      setProjectModal(null);
    },
    [setProjects, setExpenses]
  );

  // ─── Stage CRUD ───
  const handleStageSave = useCallback(
    (stage: Stage) => {
      setProjects((prev) => {
        const project = prev.find((p) => p.id === stage.projectId);
        if (!project) return prev;
        const exists = project.stages.some((s) => s.id === stage.id);
        if (exists) return updateStage(prev, stage.projectId, stage.id, stage);
        return addStage(prev, stage.projectId, stage);
      });
      setStageModal(null);
    },
    [setProjects]
  );

  const handleStageDelete = useCallback(
    (projectId: number, stageId: number) => {
      setProjects((prev) => removeStage(prev, projectId, stageId));
      setStageModal(null);
    },
    [setProjects]
  );

  // ─── Task CRUD ───
  const handleTaskSave = useCallback(
    (task: ProjectTask) => {
      setProjects((prev) => {
        const project = prev.find((p) => p.id === task.projectId);
        if (!project) return prev;
        const stage = project.stages.find((s) => s.id === task.stageId);
        if (!stage) return prev;
        const exists = stage.tasks.some((t) => t.id === task.id);
        if (exists) return updateProjectTask(prev, task.projectId, task.stageId, task.id, task);
        return addProjectTask(prev, task.projectId, task.stageId, task);
      });
      setTaskModal(null);
    },
    [setProjects]
  );

  const handleTaskDelete = useCallback(
    (projectId: number, stageId: number, taskId: number) => {
      setProjects((prev) => removeProjectTask(prev, projectId, stageId, taskId));
      setTaskModal(null);
    },
    [setProjects]
  );

  // ─── Standalone Task CRUD ───
  const handleStandaloneTaskSave = useCallback(
    (task: StandaloneTask) => {
      setStandaloneTasks((prev) => {
        const exists = prev.some((t) => t.id === task.id);
        if (exists) return prev.map((t) => (t.id === task.id ? task : t));
        return [...prev, task];
      });
    },
    [setStandaloneTasks]
  );

  const handleStandaloneTaskDelete = useCallback(
    (taskId: number) => {
      setStandaloneTasks((prev) => prev.filter((t) => t.id !== taskId));
    },
    [setStandaloneTasks]
  );

  // ─── Calendar DnD update handlers ───
  const handleCalendarUpdateProjectTask = useCallback(
    (projectId: number, stageId: number, taskId: number, updates: { deadline?: string; dueTime?: string; duration?: number }) => {
      setProjects((prev) => {
        return prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            stages: p.stages.map((s) => {
              if (s.id !== stageId) return s;
              return {
                ...s,
                tasks: s.tasks.map((t) => {
                  if (t.id !== taskId) return t;
                  return { ...t, ...updates };
                }),
              };
            }),
          };
        });
      });
    },
    [setProjects]
  );

  const handleCalendarUpdateStandaloneTask = useCallback(
    (taskId: number, updates: { deadline?: string; dueTime?: string; duration?: number }) => {
      setStandaloneTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      );
    },
    [setStandaloneTasks]
  );

  // ─── Stage dates update (Gantt drag & resize) ───
  const handleUpdateStageDates = useCallback(
    (projectId: number, stageId: number, updates: { startDate?: string; deadline?: string }) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            stages: p.stages.map((s) => {
              if (s.id !== stageId) return s;
              return { ...s, ...updates };
            }),
          };
        })
      );
    },
    [setProjects]
  );

  // ─── Recurring Task CRUD ───
  const handleRecurringTaskSave = useCallback(
    (task: RecurringTask) => {
      setRecurringTasks((prev) => {
        const exists = prev.some((t) => t.id === task.id);
        if (exists) return prev.map((t) => (t.id === task.id ? task : t));
        return [...prev, task];
      });
    },
    [setRecurringTasks]
  );

  const handleRecurringTaskDelete = useCallback(
    (taskId: number) => {
      setRecurringTasks((prev) => prev.filter((t) => t.id !== taskId));
    },
    [setRecurringTasks]
  );

  // ─── Status update helpers for AllTasksTab ───
  const handleUpdateProjectTaskStatus = useCallback(
    (projectId: number, stageId: number, taskId: number, status: import("@/types/dashboard").ProjectTaskStatus) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            stages: p.stages.map((s) => {
              if (s.id !== stageId) return s;
              return {
                ...s,
                tasks: s.tasks.map((t) =>
                  t.id === taskId ? { ...t, status } : t
                ),
              };
            }),
          };
        })
      );
    },
    [setProjects]
  );

  const handleUpdateStandaloneTaskStatus = useCallback(
    (taskId: number, status: import("@/types/dashboard").StandaloneTaskStatus) => {
      setStandaloneTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status } : t))
      );
    },
    [setStandaloneTasks]
  );

  const tabs: { id: ProjectsTabId; label: string }[] = [
    { id: "projects", label: "Проекты" },
    { id: "kanban", label: "Канбан" },
    { id: "all-tasks", label: "Все задачи" },
    { id: "standalone", label: "Текущие задачи" },
    { id: "recurring", label: "Регулярные" },
    { id: "calendar", label: "Календарь" },
  ];

  // Collect all sortable IDs for the outer DndContext
  const allSortableIds = useMemo(() => {
    const ids: string[] = [];
    // Plan IDs
    for (const plan of sortedPlans) {
      ids.push(`plan-${plan.id}`);
      for (const item of plan.items) {
        ids.push(`planitem-${item.id}`);
        const itemProjects = projectsByPlanItem.get(item.id) || [];
        for (const p of itemProjects) {
          ids.push(`project-${p.id}`);
          for (const s of p.stages) {
            ids.push(`stage-${s.id}`);
          }
        }
      }
    }
    // Standalone project IDs
    for (const p of standaloneProjects) {
      ids.push(`project-${p.id}`);
      for (const s of p.stages) {
        ids.push(`stage-${s.id}`);
      }
    }
    return ids;
  }, [sortedPlans, projectsByPlanItem, standaloneProjects]);

  // Overdue items — projects, plans, plan items — only show to responsible person and admin
  // Uses hierarchy: cancelled plan → all items cancelled; cancelled item → all projects cancelled; etc.
  const overdueItems = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const isAdmin = user?.role === "admin";
    const currentName = user?.employeeName;
    const items: { id: string; name: string; type: string; deadline: string }[] = [];

    // Build set of effectively cancelled planItemIds (own or parent plan cancelled)
    const cancelledItemIds = new Set<number>();
    for (const plan of plans) {
      for (const item of plan.items) {
        if (plan.cancelled || item.cancelled) cancelledItemIds.add(item.id);
      }
    }

    // Helper: is a project effectively cancelled (own, or its planItem/plan is cancelled)
    const isProjectEffectivelyCancelled = (p: Project) =>
      !!p.cancelled || (p.planItemId != null && cancelledItemIds.has(p.planItemId));

    // Helper: get active tasks from a project (skip cancelled stages/tasks)
    const getActiveTasks = (p: Project) =>
      p.stages.filter((s) => !s.cancelled).flatMap((s) => s.tasks.filter((t) => !t.cancelled));

    // Overdue projects (skip effectively cancelled)
    for (const p of projects) {
      if (isProjectEffectivelyCancelled(p)) continue;
      const allTasks = getActiveTasks(p);
      const allDone = allTasks.length > 0 && allTasks.every((t) => t.status === "done");
      if (allDone || p.deadline >= todayStr) continue;
      if (isAdmin || p.responsible === currentName) {
        items.push({ id: `p-${p.id}`, name: p.name, type: "Проект", deadline: p.deadline });
      }
    }

    // Overdue plans (skip cancelled)
    for (const plan of plans) {
      if (plan.cancelled) continue;
      if (plan.deadline >= todayStr) continue;
      const allTasks = plan.items.filter((i) => !i.cancelled).flatMap((item) =>
        (projectsByPlanItem.get(item.id) || []).filter((p) => !p.cancelled).flatMap(getActiveTasks)
      );
      const allDone = allTasks.length > 0 && allTasks.every((t) => t.status === "done");
      if (!allDone && isAdmin) {
        items.push({ id: `plan-${plan.id}`, name: plan.name, type: "План", deadline: plan.deadline });
      }
    }

    // Overdue plan items (skip cancelled plans/items)
    for (const plan of plans) {
      if (plan.cancelled) continue;
      for (const item of plan.items) {
        if (item.cancelled) continue;
        if (item.deadline >= todayStr) continue;
        const itemProjects = (projectsByPlanItem.get(item.id) || []).filter((p) => !p.cancelled);
        const allTasks = itemProjects.flatMap(getActiveTasks);
        const allDone = allTasks.length > 0 && allTasks.every((t) => t.status === "done");
        if (!allDone) {
          const isResponsible = item.responsible === currentName;
          if (isAdmin || isResponsible) {
            items.push({ id: `pi-${item.id}`, name: item.name, type: "Пункт плана", deadline: item.deadline });
          }
        }
      }
    }

    return items;
  }, [projects, plans, projectsByPlanItem, user]);

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Overdue notification badge - fixed top right */}
      {overdueItems.length > 0 && (
        <div className="fixed top-4 right-4 z-50 bg-red-500 text-white rounded-xl shadow-lg p-3 max-w-xs animate-pulse">
          <p className="text-xs font-bold mb-1">Просрочено ({overdueItems.length})</p>
          {overdueItems.slice(0, 4).map((item) => (
            <p key={item.id} className="text-[10px] truncate">
              <span className="opacity-70">{item.type}:</span> {item.name}
            </p>
          ))}
          {overdueItems.length > 4 && <p className="text-[10px]">и ещё {overdueItems.length - 4}...</p>}
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Проекты</h1>
            <p className="text-sm text-gray-500 mt-1">
              {filteredProjects.length} проект{filteredProjects.length === 1 ? "" : filteredProjects.length < 5 ? "а" : "ов"}
              {filteredProjects.length !== projects.length && ` из ${projects.length}`}
              {sortedPlans.length > 0 && ` · ${sortedPlans.length} план${sortedPlans.length === 1 ? "" : sortedPlans.length < 5 ? "а" : "ов"}`}
              {tab === "projects" && " · Перетаскивайте для управления"}
            </p>
          </div>
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-gray-200 shadow-sm self-start sm:self-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  tab === t.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {tab === "projects" && (
          <>
            {/* Action buttons + employee filter */}
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setPlanModal({ plan: null })}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
              >
                + Новый план
              </button>
              <button
                onClick={() => setProjectModal({ project: null, planItemId: null })}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
              >
                + Новый проект
              </button>
              <div className="ml-auto flex items-center gap-1.5">
                <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Сотрудник:</label>
                <select
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[200px]"
                >
                  <option value="__all__">Все сотрудники</option>
                  {allProjectEmployees.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Plans + Projects with DnD */}
            {mounted ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedPlans.map((p) => `plan-${p.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {/* Plans */}
                    {sortedPlans.map((plan) => (
                      <PlanBlock
                        key={plan.id}
                        plan={plan}
                        projectsByItem={projectsByPlanItem}
                        onEdit={() => setPlanModal({ plan })}
                        onDelete={() => handlePlanDelete(plan.id)}
                        onAddItem={() => setPlanItemModal({ item: null, planId: plan.id })}
                        onEditItem={(item) => setPlanItemModal({ item, planId: plan.id })}
                        onDeleteItem={(itemId) => handlePlanItemDelete(plan.id, itemId)}
                        onAddProjectToItem={(itemId) => setProjectModal({ project: null, planItemId: itemId })}
                        onEditProject={(p) => setProjectModal({ project: p })}
                        onDeleteProject={handleProjectDelete}
                        onEditStage={(pid, stage) =>
                          setStageModal({
                            stage,
                            projectId: pid,
                            projectName: projects.find((p) => p.id === pid)?.name ?? "",
                          })
                        }
                        onDeleteStage={(pid, sid) => handleStageDelete(pid, sid)}
                        onAddStage={(pid) =>
                          setStageModal({
                            stage: null,
                            projectId: pid,
                            projectName: projects.find((p) => p.id === pid)?.name ?? "",
                          })
                        }
                        onEditTask={(pid, sid, task) => {
                          const project = projects.find((p) => p.id === pid);
                          const stage = project?.stages.find((s) => s.id === sid);
                          setTaskModal({
                            task,
                            projectId: pid,
                            stageId: sid,
                            stageName: stage?.name ?? "",
                          });
                        }}
                        onAddTask={(pid, sid) => {
                          const project = projects.find((p) => p.id === pid);
                          const stage = project?.stages.find((s) => s.id === sid);
                          setTaskModal({
                            task: null,
                            projectId: pid,
                            stageId: sid,
                            stageName: stage?.name ?? "",
                          });
                        }}
                      />
                    ))}

                    {/* Standalone projects zone */}
                    <StandaloneDropZone isEmpty={standaloneProjects.length === 0}>
                      <SortableContext
                        items={standaloneProjects.map((p) => `project-${p.id}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {standaloneProjects.map((project) => (
                            <CompactProjectCard
                              key={project.id}
                              project={project}
                              showInline
                              onEdit={() => setProjectModal({ project })}
                              onDelete={() => {
                                if (window.confirm("Удалить проект?")) handleProjectDelete(project.id);
                              }}
                              onEditStage={(pid, stage) =>
                                setStageModal({
                                  stage,
                                  projectId: pid,
                                  projectName: projects.find((p) => p.id === pid)?.name ?? "",
                                })
                              }
                              onDeleteStage={(pid, sid) => handleStageDelete(pid, sid)}
                              onAddStage={(pid) =>
                                setStageModal({
                                  stage: null,
                                  projectId: pid,
                                  projectName: projects.find((p) => p.id === pid)?.name ?? "",
                                })
                              }
                              onEditTask={(pid, sid, task) => {
                                const project = projects.find((p) => p.id === pid);
                                const stage = project?.stages.find((s) => s.id === sid);
                                setTaskModal({
                                  task,
                                  projectId: pid,
                                  stageId: sid,
                                  stageName: stage?.name ?? "",
                                });
                              }}
                              onAddTask={(pid, sid) => {
                                const project = projects.find((p) => p.id === pid);
                                const stage = project?.stages.find((s) => s.id === sid);
                                setTaskModal({
                                  task: null,
                                  projectId: pid,
                                  stageId: sid,
                                  stageName: stage?.name ?? "",
                                });
                              }}
                            />
                          ))}
                        </div>
                      </SortableContext>
                      {standaloneProjects.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-6">
                          Перетащите проекты сюда или создайте новый
                        </p>
                      )}
                    </StandaloneDropZone>
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              /* Static placeholder during SSR */
              <div className="space-y-4">
                {sortedPlans.map((plan) => (
                  <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
                    <h3 className="text-base font-bold text-gray-900">📋 {plan.name}</h3>
                  </div>
                ))}
                {standaloneProjects.map((project) => (
                  <div key={project.id} className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
                    <h3 className="text-base font-bold text-gray-900">{project.name}</h3>
                    {project.goal && <p className="text-sm text-gray-500 mt-1">Цель: {project.goal}</p>}
                  </div>
                ))}
              </div>
            )}

            {plans.length === 0 && standaloneProjects.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">Нет проектов и планов</p>
                <p className="text-sm mt-1">Создайте первый план или проект, нажав кнопки выше</p>
              </div>
            )}
          </>
        )}

        {tab === "kanban" && (
          <KanbanBoard
            projects={projects}
            employees={employees}
            cancelledProjectIds={effectivelyCancelledProjectIds}
            onToggleTaskStatus={handleUpdateProjectTaskStatus}
          />
        )}

        {tab === "all-tasks" && (
          <AllTasksTab
            projects={projects}
            standaloneTasks={standaloneTasks}
            onEditProjectTask={(projectId, stageId, task) => {
              const project = projects.find((p) => p.id === projectId);
              const stage = project?.stages.find((s) => s.id === stageId);
              setTaskModal({
                task,
                projectId,
                stageId,
                stageName: stage?.name ?? "",
              });
            }}
            onEditStandaloneTask={(task) => setStandaloneEditTask(task)}
            onDeleteProjectTask={handleTaskDelete}
            onDeleteStandaloneTask={handleStandaloneTaskDelete}
            onUpdateProjectTaskStatus={handleUpdateProjectTaskStatus}
            onUpdateStandaloneTaskStatus={handleUpdateStandaloneTaskStatus}
          />
        )}

        {tab === "standalone" && (
          <StandaloneTasksTab
            tasks={standaloneTasks}
            projects={projects}
            plans={plans}
            recurringTasks={recurringTasks}
            channels={channels}
            employees={employees}
            onSave={handleStandaloneTaskSave}
            onDelete={handleStandaloneTaskDelete}
            onUpdateProjectTaskStatus={handleUpdateProjectTaskStatus}
            onUpdateStandaloneTaskStatus={handleUpdateStandaloneTaskStatus}
          />
        )}

        {tab === "recurring" && (
          <RecurringTasksTab
            tasks={recurringTasks}
            channels={channels}
            employees={employees}
            onSave={handleRecurringTaskSave}
            onDelete={handleRecurringTaskDelete}
          />
        )}

        {tab === "calendar" && (
          <ProjectsCalendarTab
            projects={projects}
            plans={plans}
            standaloneTasks={standaloneTasks}
            recurringTasks={recurringTasks}
            channels={channels}
            employees={employees}
            currentUser={user}
            onUpdateProjectTask={handleCalendarUpdateProjectTask}
            onUpdateStandaloneTask={handleCalendarUpdateStandaloneTask}
            onCreateStandaloneTask={handleStandaloneTaskSave}
            onToggleProjectTaskStatus={handleUpdateProjectTaskStatus}
            onToggleStandaloneTaskStatus={handleUpdateStandaloneTaskStatus}
            onUpdateStageDates={handleUpdateStageDates}
          />
        )}
      </div>

      {/* Modals */}
      {planModal && (
        <PlanEditModal
          plan={planModal.plan}
          onSave={handlePlanSave}
          onDelete={planModal.plan ? () => handlePlanDelete(planModal.plan!.id) : undefined}
          onClose={() => setPlanModal(null)}
        />
      )}

      {planItemModal && (
        <PlanItemEditModal
          item={planItemModal.item}
          planId={planItemModal.planId}
          employees={employees}
          onSave={handlePlanItemSave}
          onDelete={
            planItemModal.item
              ? (itemId) => handlePlanItemDelete(planItemModal.planId, itemId)
              : undefined
          }
          onClose={() => setPlanItemModal(null)}
        />
      )}

      {projectModal && (
        <ProjectEditModal
          project={projectModal.project}
          onSave={(project) => {
            // If creating from a PlanItem, set planItemId
            const finalProject = projectModal.planItemId != null && !projectModal.project
              ? { ...project, planItemId: projectModal.planItemId }
              : project;
            handleProjectSave(finalProject);
          }}
          onDelete={projectModal.project ? handleProjectDelete : undefined}
          onClose={() => setProjectModal(null)}
        />
      )}

      {stageModal && (
        <StageEditModal
          stage={stageModal.stage}
          projectId={stageModal.projectId}
          projectName={stageModal.projectName}
          onSave={handleStageSave}
          onDelete={
            stageModal.stage
              ? (sid) => handleStageDelete(stageModal.projectId, sid)
              : undefined
          }
          onClose={() => setStageModal(null)}
        />
      )}

      {taskModal && (
        <ProjectTaskEditModal
          task={taskModal.task}
          projectId={taskModal.projectId}
          stageId={taskModal.stageId}
          stageName={taskModal.stageName}
          onSave={handleTaskSave}
          onDelete={
            taskModal.task
              ? (tid) => handleTaskDelete(taskModal.projectId, taskModal.stageId, tid)
              : undefined
          }
          onClose={() => setTaskModal(null)}
        />
      )}

      {standaloneEditTask && (
        <StandaloneTaskModal
          task={standaloneEditTask}
          channels={channels}
          onSave={(task) => {
            handleStandaloneTaskSave(task);
            setStandaloneEditTask(null);
          }}
          onDelete={(taskId) => {
            handleStandaloneTaskDelete(taskId);
            setStandaloneEditTask(null);
          }}
          onClose={() => setStandaloneEditTask(null)}
        />
      )}
    </div>
  );
}
