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
import type { Project, Stage, ProjectTask, Plan, PlanItem } from "@/types/dashboard";
import { useAppContext } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import {
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

import ProjectEditModal from "@/components/projects/project-edit-modal";
import StageEditModal from "@/components/projects/stage-edit-modal";
import ProjectTaskEditModal from "@/components/projects/project-task-edit-modal";
import PlanBlock from "@/components/projects/plan-block";
import PlanEditModal from "@/components/projects/plan-edit-modal";
import PlanItemEditModal from "@/components/projects/plan-item-edit-modal";
import CompactProjectCard from "@/components/projects/compact-project-card";

interface EditProjectModal { project: Project | null; planItemId?: number | null }
interface EditStageModal { stage: Stage | null; projectId: number; projectName: string }
interface EditTaskModal { task: ProjectTask | null; projectId: number; stageId: number; stageName: string }
interface EditPlanModal { plan: Plan | null }
interface EditPlanItemModal { item: PlanItem | null; planId: number }

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

export default function ProjectsBoardDashboard() {
  const { projects, setProjects, setExpenses, employees, plans, setPlans } = useAppContext();
  const { user } = useAuth();

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [filterEmployee, setFilterEmployee] = useState<string | "__all__">(user?.employeeName ?? "__all__");

  // Все сотрудники (только из regular-проектов)
  const allProjectEmployees = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      if (p.kind === "content") continue;
      if (p.responsible) set.add(p.responsible);
      for (const s of p.stages) {
        for (const t of s.tasks) {
          if (t.assignee) set.add(t.assignee);
        }
      }
    }
    return [...set].sort();
  }, [projects]);

  // Только regular проекты (теневые контент-проекты исключаем)
  const regularProjects = useMemo(() => projects.filter((p) => p.kind !== "content"), [projects]);

  const filteredProjects = useMemo(() => {
    if (filterEmployee === "__all__") return regularProjects;
    return regularProjects.filter((p) => {
      if (p.responsible === filterEmployee) return true;
      for (const s of p.stages) {
        for (const t of s.tasks) {
          if (t.assignee === filterEmployee) return true;
        }
      }
      return false;
    });
  }, [regularProjects, filterEmployee]);

  const [projectModal, setProjectModal] = useState<EditProjectModal | null>(null);
  const [stageModal, setStageModal] = useState<EditStageModal | null>(null);
  const [taskModal, setTaskModal] = useState<EditTaskModal | null>(null);
  const [planModal, setPlanModal] = useState<EditPlanModal | null>(null);
  const [planItemModal, setPlanItemModal] = useState<EditPlanItemModal | null>(null);

  const standaloneProjects = useMemo(
    () => filteredProjects.filter((p) => p.planItemId == null).sort((a, b) => a.priority - b.priority),
    [filteredProjects]
  );

  const projectsByPlanItem = useMemo(() => {
    const map = new Map<number, Project[]>();
    for (const p of filteredProjects) {
      if (p.planItemId != null) {
        if (!map.has(p.planItemId)) map.set(p.planItemId, []);
        map.get(p.planItemId)!.push(p);
      }
    }
    for (const [key, arr] of map) {
      map.set(key, arr.sort((a, b) => a.priority - b.priority));
    }
    return map;
  }, [filteredProjects]);

  const sortedPlans = useMemo(() => {
    const allSorted = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
    if (filterEmployee === "__all__") return allSorted;
    return allSorted.filter((plan) =>
      plan.items.some((item) => (projectsByPlanItem.get(item.id) ?? []).length > 0)
    );
  }, [plans, filterEmployee, projectsByPlanItem]);

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

      if (activeId.startsWith("project-")) {
        const projectId = parseInt(activeId.replace("project-", ""), 10);

        if (overId.startsWith("planitem-")) {
          const targetItemId = parseInt(overId.replace("planitem-", ""), 10);
          setProjects((prev) =>
            prev.map((p) => p.id !== projectId ? p : { ...p, planItemId: targetItemId })
          );
          return;
        }

        if (overId === "standalone-zone") {
          setProjects((prev) =>
            prev.map((p) => p.id !== projectId ? p : { ...p, planItemId: null })
          );
          return;
        }

        if (overId.startsWith("project-")) {
          const overProjectId = parseInt(overId.replace("project-", ""), 10);
          const activeProject = projects.find((p) => p.id === projectId);
          const overProject = projects.find((p) => p.id === overProjectId);
          if (!activeProject || !overProject) return;

          if (activeProject.planItemId !== overProject.planItemId) {
            setProjects((prev) =>
              prev.map((p) => p.id !== projectId ? p : { ...p, planItemId: overProject.planItemId })
            );
            return;
          }

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

      if (activeId.startsWith("planitem-") && overId.startsWith("planitem-")) {
        const activeItemId = parseInt(activeId.replace("planitem-", ""), 10);
        const overItemId = parseInt(overId.replace("planitem-", ""), 10);

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

      if (activeId.startsWith("stage-")) {
        const activeStageId = parseInt(activeId.replace("stage-", ""), 10);
        const sourceProject = projects.find((p) => p.stages.some((s) => s.id === activeStageId));
        if (!sourceProject) return;
        const draggedStage = sourceProject.stages.find((s) => s.id === activeStageId)!;

        if (overId.startsWith("stage-")) {
          const overStageId = parseInt(overId.replace("stage-", ""), 10);
          const targetProject = projects.find((p) => p.stages.some((s) => s.id === overStageId));
          if (!targetProject) return;

          if (sourceProject.id === targetProject.id) {
            const oldIdx = sourceProject.stages.findIndex((s) => s.id === activeStageId);
            const newIdx = sourceProject.stages.findIndex((s) => s.id === overStageId);
            if (oldIdx === -1 || newIdx === -1) return;
            const reordered = arrayMove(sourceProject.stages, oldIdx, newIdx);
            setProjects(reorderStages(projects, sourceProject.id, reordered.map((s) => s.id)));
          } else {
            const overIdx = targetProject.stages.findIndex((s) => s.id === overStageId);
            const movedStage = { ...draggedStage, projectId: targetProject.id };
            movedStage.tasks = movedStage.tasks.map((t) => ({ ...t, projectId: targetProject.id }));

            setProjects((prev) =>
              prev.map((p) => {
                if (p.id === sourceProject.id) {
                  return { ...p, stages: p.stages.filter((s) => s.id !== activeStageId) };
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

  // ─── CRUD handlers ───
  const handlePlanSave = useCallback((plan: Plan) => {
    setPlans((prev) => {
      const exists = prev.some((p) => p.id === plan.id);
      if (exists) return updatePlan(prev, plan.id, plan);
      return addPlan(prev, plan);
    });
    setPlanModal(null);
  }, [setPlans]);

  const handlePlanDelete = useCallback((planId: number) => {
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      const itemIds = new Set(plan.items.map((i) => i.id));
      setProjects((prev) =>
        prev.map((p) => itemIds.has(p.planItemId!) ? { ...p, planItemId: null } : p)
      );
    }
    setPlans((prev) => removePlan(prev, planId));
    setPlanModal(null);
  }, [plans, setPlans, setProjects]);

  const handlePlanItemSave = useCallback((item: PlanItem) => {
    setPlans((prev) => {
      const plan = prev.find((p) => p.id === item.planId);
      if (!plan) return prev;
      const exists = plan.items.some((i) => i.id === item.id);
      if (exists) return updatePlanItem(prev, item.planId, item.id, item);
      return addPlanItem(prev, item.planId, item);
    });
    setPlanItemModal(null);
  }, [setPlans]);

  const handlePlanItemDelete = useCallback((planId: number, itemId: number) => {
    setProjects((prev) =>
      prev.map((p) => p.planItemId === itemId ? { ...p, planItemId: null } : p)
    );
    setPlans((prev) => removePlanItem(prev, planId, itemId));
    setPlanItemModal(null);
  }, [setPlans, setProjects]);

  const handleProjectSave = useCallback((project: Project) => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === project.id);
      if (exists) return updateProject(prev, project.id, project);
      return addProject(prev, project);
    });
    setProjectModal(null);
  }, [setProjects]);

  const handleProjectDelete = useCallback((projectId: number) => {
    setProjects((prev) => removeProject(prev, projectId));
    setExpenses((prev) =>
      prev.map((e) => (e.projectId === projectId ? { ...e, projectId: null } : e))
    );
    setProjectModal(null);
  }, [setProjects, setExpenses]);

  const handleStageSave = useCallback((stage: Stage) => {
    setProjects((prev) => {
      const project = prev.find((p) => p.id === stage.projectId);
      if (!project) return prev;
      const exists = project.stages.some((s) => s.id === stage.id);
      if (exists) return updateStage(prev, stage.projectId, stage.id, stage);
      return addStage(prev, stage.projectId, stage);
    });
    setStageModal(null);
  }, [setProjects]);

  const handleStageDelete = useCallback((projectId: number, stageId: number) => {
    setProjects((prev) => removeStage(prev, projectId, stageId));
    setStageModal(null);
  }, [setProjects]);

  const handleTaskSave = useCallback((task: ProjectTask) => {
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
  }, [setProjects]);

  const handleTaskDelete = useCallback((projectId: number, stageId: number, taskId: number) => {
    setProjects((prev) => removeProjectTask(prev, projectId, stageId, taskId));
    setTaskModal(null);
  }, [setProjects]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Проекты</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filteredProjects.length} проект{filteredProjects.length === 1 ? "" : filteredProjects.length < 5 ? "а" : "ов"}
              {filteredProjects.length !== regularProjects.length && ` из ${regularProjects.length}`}
              {sortedPlans.length > 0 && ` · ${sortedPlans.length} план${sortedPlans.length === 1 ? "" : sortedPlans.length < 5 ? "а" : "ов"}`}
              {" · Перетаскивайте для управления"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 border border-gray-200 dark:border-gray-700 shadow-sm">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Сотрудник:</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="text-xs bg-transparent text-gray-700 dark:text-gray-200 focus:outline-none max-w-[160px]"
            >
              <option value="__all__">Все сотрудники</option>
              {allProjectEmployees.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPlanModal({ plan: null })}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            + Новый план
          </button>
          <button
            onClick={() => setProjectModal({ project: null, planItemId: null })}
            className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            + Новый проект
          </button>
        </div>

        {mounted ? (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedPlans.map((p) => `plan-${p.id}`)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
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
                      setTaskModal({ task, projectId: pid, stageId: sid, stageName: stage?.name ?? "" });
                    }}
                    onAddTask={(pid, sid) => {
                      const project = projects.find((p) => p.id === pid);
                      const stage = project?.stages.find((s) => s.id === sid);
                      setTaskModal({ task: null, projectId: pid, stageId: sid, stageName: stage?.name ?? "" });
                    }}
                  />
                ))}

                <StandaloneDropZone isEmpty={standaloneProjects.length === 0}>
                  <SortableContext items={standaloneProjects.map((p) => `project-${p.id}`)} strategy={verticalListSortingStrategy}>
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
                            setTaskModal({ task, projectId: pid, stageId: sid, stageName: stage?.name ?? "" });
                          }}
                          onAddTask={(pid, sid) => {
                            const project = projects.find((p) => p.id === pid);
                            const stage = project?.stages.find((s) => s.id === sid);
                            setTaskModal({ task: null, projectId: pid, stageId: sid, stageName: stage?.name ?? "" });
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
          <div className="space-y-4">
            {sortedPlans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
                <h3 className="text-base font-bold text-gray-900">📋 {plan.name}</h3>
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
      </div>

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
          employees={employees}
          onSave={handleTaskSave}
          onDelete={
            taskModal.task
              ? (tid) => handleTaskDelete(taskModal.projectId, taskModal.stageId, tid)
              : undefined
          }
          onClose={() => setTaskModal(null)}
        />
      )}
    </div>
  );
}
