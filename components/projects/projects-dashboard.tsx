"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  DndContext,
  closestCenter,
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
import type { Project, Stage, ProjectTask, StandaloneTask, RecurringTask } from "@/types/dashboard";
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
} from "@/lib/project-utils";
import { totalExpensesForProject } from "@/lib/expense-utils";
import SortableProjectCard from "./sortable-project-card";
import ProjectEditModal from "./project-edit-modal";
import StageEditModal from "./stage-edit-modal";
import ProjectTaskEditModal from "./project-task-edit-modal";
import StandaloneTasksTab from "./standalone-tasks-tab";
import RecurringTasksTab from "./recurring-tasks-tab";
import ProjectsCalendarTab from "./projects-calendar-tab";

// ─── Modal state types ───
interface EditProjectModal { project: Project | null }
interface EditStageModal { stage: Stage | null; projectId: number; projectName: string }
interface EditTaskModal { task: ProjectTask | null; projectId: number; stageId: number; stageName: string }

type ProjectsTabId = "projects" | "standalone" | "recurring" | "calendar";

export default function ProjectsDashboard() {
  const { projects, setProjects, expenses, setExpenses, channels, employees, standaloneTasks, setStandaloneTasks, recurringTasks, setRecurringTasks } = useAppContext();
  const { user } = useAuth();

  // Prevent hydration mismatch from @dnd-kit attributes
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [tab, setTab] = useState<ProjectsTabId>("projects");

  // Modal states
  const [projectModal, setProjectModal] = useState<EditProjectModal | null>(null);
  const [stageModal, setStageModal] = useState<EditStageModal | null>(null);
  const [taskModal, setTaskModal] = useState<EditTaskModal | null>(null);

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.priority - b.priority),
    [projects]
  );

  // ─── DnD ───
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sortedProjects.findIndex((p) => p.id === active.id);
      const newIndex = sortedProjects.findIndex((p) => p.id === over.id);
      const reordered = arrayMove(sortedProjects, oldIndex, newIndex);
      setProjects(reorderProjects(projects, reordered.map((p) => p.id)));
    },
    [sortedProjects, projects, setProjects]
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
      // Unlink expenses
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

  const tabs: { id: ProjectsTabId; label: string }[] = [
    { id: "projects", label: "Проекты" },
    { id: "standalone", label: "Текущие задачи" },
    { id: "recurring", label: "Регулярные" },
    { id: "calendar", label: "Календарь" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Проекты</h1>
            <p className="text-sm text-gray-500 mt-1">
              {projects.length} проект{projects.length === 1 ? "" : projects.length < 5 ? "а" : "ов"}
              {tab === "projects" && " · Перетаскивайте для смены приоритета"}
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
            <div className="mb-4">
              <button
                onClick={() => setProjectModal({ project: null })}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
              >
                + Новый проект
              </button>
            </div>
            {/* Project list with DnD — render only after mount to avoid hydration mismatch */}
            {mounted ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedProjects.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {sortedProjects.map((project) => (
                      <SortableProjectCard
                        key={project.id}
                        project={project}
                        totalExpenses={totalExpensesForProject(expenses, project.id)}
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
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              /* Static placeholder during SSR to avoid layout shift */
              <div className="space-y-4">
                {sortedProjects.map((project) => (
                  <div key={project.id} className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4">
                    <h3 className="text-base font-bold text-gray-900">{project.name}</h3>
                    {project.goal && <p className="text-sm text-gray-500 mt-1">Цель: {project.goal}</p>}
                  </div>
                ))}
              </div>
            )}

            {sortedProjects.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">Нет проектов</p>
                <p className="text-sm mt-1">Создайте первый проект, нажав кнопку выше</p>
              </div>
            )}
          </>
        )}

        {tab === "standalone" && (
          <StandaloneTasksTab
            tasks={standaloneTasks}
            channels={channels}
            onSave={handleStandaloneTaskSave}
            onDelete={handleStandaloneTaskDelete}
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
            standaloneTasks={standaloneTasks}
            recurringTasks={recurringTasks}
            channels={channels}
            employees={employees}
            currentUser={user}
            onUpdateProjectTask={handleCalendarUpdateProjectTask}
            onUpdateStandaloneTask={handleCalendarUpdateStandaloneTask}
          />
        )}
      </div>

      {/* Modals */}
      {projectModal && (
        <ProjectEditModal
          project={projectModal.project}
          onSave={handleProjectSave}
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
    </div>
  );
}
