"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { Project, ProjectTask, StandaloneTask, RecurringTask } from "@/types/dashboard";
import { useAppContext } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import {
  updateProject,
  updateProjectTask,
  deleteProjectTask as removeProjectTask,
} from "@/lib/project-utils";

import ProjectTaskEditModal from "./project-task-edit-modal";
import { StandaloneTaskModal } from "./standalone-tasks-tab";
import RecurringTasksTab from "./recurring-tasks-tab";
import ProjectsCalendarTab from "./projects-calendar-tab";
import AllTasksTab from "./all-tasks-tab";
import KanbanBoard from "./kanban-board";
import ContentProjectsTab from "./content-projects-tab";

// ─── Modal state types ───
interface EditTaskModal { task: ProjectTask | null; projectId: number; stageId: number; stageName: string }

type ProjectsTabId = "kanban" | "calendar" | "all-tasks" | "content" | "recurring";

export default function ProjectsDashboard() {
  const {
    projects, setProjects,
    setExpenses,
    channels, employees,
    standaloneTasks, setStandaloneTasks,
    recurringTasks, setRecurringTasks,
    plans,
  } = useAppContext();
  const { user } = useAuth();

  // Prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [tab, setTab] = useState<ProjectsTabId>("all-tasks");

  // Auto-фильтр по текущему пользователю — действует на всех вкладках
  const [filterEmployee, setFilterEmployee] = useState<string | "__all__">(user?.employeeName ?? "__all__");

  // Уникальные сотрудники из задач
  const allEmployees = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      if (p.responsible) set.add(p.responsible);
      for (const s of p.stages) {
        for (const t of s.tasks) {
          if (t.assignee) set.add(t.assignee);
        }
      }
    }
    for (const t of standaloneTasks) {
      if (t.assignee) set.add(t.assignee);
    }
    return [...set].sort();
  }, [projects, standaloneTasks]);

  // Modal states
  const [taskModal, setTaskModal] = useState<EditTaskModal | null>(null);
  const [standaloneEditTask, setStandaloneEditTask] = useState<StandaloneTask | null>(null);

  // Set of effectively cancelled project IDs
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

  // ─── Project task CRUD ───
  const handleProjectDelete = useCallback(
    (projectId: number) => {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setExpenses((prev) =>
        prev.map((e) => (e.projectId === projectId ? { ...e, projectId: null } : e))
      );
    },
    [setProjects, setExpenses]
  );

  // Задачи в обычном проекте создаём через ProjectTaskEditModal -> setProjects
  const handleTaskSave = useCallback(
    (task: ProjectTask) => {
      setProjects((prev) => {
        const project = prev.find((p) => p.id === task.projectId);
        if (!project) return prev;
        const stage = project.stages.find((s) => s.id === task.stageId);
        if (!stage) return prev;
        const exists = stage.tasks.some((t) => t.id === task.id);
        if (exists) return updateProjectTask(prev, task.projectId, task.stageId, task.id, task);
        // create
        return prev.map((p) => {
          if (p.id !== task.projectId) return p;
          return {
            ...p,
            stages: p.stages.map((s) => (s.id !== task.stageId ? s : { ...s, tasks: [...s.tasks, task] })),
          };
        });
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

  const handleUpdateStageDates = useCallback(
    (projectId: number, stageId: number, updates: { startDate?: string; deadline?: string }) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId) return p;
          return {
            ...p,
            stages: p.stages.map((s) => (s.id !== stageId ? s : { ...s, ...updates })),
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

  // ─── Status update helpers ───
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
    { id: "kanban", label: "Канбан" },
    { id: "calendar", label: "Календарь" },
    { id: "all-tasks", label: "Все задачи" },
    { id: "content", label: "Контент" },
    { id: "recurring", label: "Регулярные" },
  ];

  // ─── Overdue items — теперь висит в левом нижнем углу ───
  const overdueItems = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const isAdmin = user?.role === "admin";
    const currentName = user?.employeeName;
    const items: { id: string; name: string; type: string; deadline: string }[] = [];

    const cancelledItemIds = new Set<number>();
    for (const plan of plans) {
      for (const item of plan.items) {
        if (plan.cancelled || item.cancelled) cancelledItemIds.add(item.id);
      }
    }
    const isProjectEffectivelyCancelled = (p: Project) =>
      !!p.cancelled || (p.planItemId != null && cancelledItemIds.has(p.planItemId));
    const getActiveTasks = (p: Project) =>
      p.stages.filter((s) => !s.cancelled).flatMap((s) => s.tasks.filter((t) => !t.cancelled));

    for (const p of projects) {
      if (isProjectEffectivelyCancelled(p)) continue;
      const allTasks = getActiveTasks(p);
      const allDone = allTasks.length > 0 && allTasks.every((t) => t.status === "done");
      if (allDone || p.deadline >= todayStr) continue;
      if (isAdmin || p.responsible === currentName) {
        items.push({ id: `p-${p.id}`, name: p.name, type: "Проект", deadline: p.deadline });
      }
    }

    return items;
  }, [projects, plans, user]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      {/* Overdue notification — left-bottom */}
      {overdueItems.length > 0 && (
        <div className="fixed bottom-4 left-4 z-50 bg-red-500 text-white rounded-xl shadow-lg p-3 max-w-xs">
          <p className="text-xs font-bold mb-1">Просрочено ({overdueItems.length})</p>
          {overdueItems.slice(0, 4).map((item) => (
            <p key={item.id} className="text-[10px] truncate">
              <span className="opacity-70">{item.type}:</span> {item.name}
            </p>
          ))}
          {overdueItems.length > 4 && <p className="text-[10px]">и ещё {overdueItems.length - 4}...</p>}
        </div>
      )}
      {/* Top tab bar — full width */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-stretch overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 min-w-[110px] py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border-b-2 ${
                  tab === t.id
                    ? "border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-indigo-50/40 dark:bg-indigo-900/20"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Задачи</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filterEmployee === "__all__" ? "Все сотрудники" : filterEmployee}
            </p>
          </div>

          {/* Employee filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 rounded-xl px-3 py-1.5 border border-gray-200 dark:border-gray-700 shadow-sm self-start sm:self-auto">
            <label className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Сотрудник:</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="text-xs bg-transparent text-gray-700 dark:text-gray-200 focus:outline-none max-w-[160px]"
            >
              <option value="__all__">Все</option>
              {allEmployees.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab content */}
        {mounted && tab === "kanban" && (
          <KanbanBoard
            projects={projects}
            standaloneTasks={standaloneTasks}
            employees={employees}
            channels={channels}
            cancelledProjectIds={effectivelyCancelledProjectIds}
            defaultFilterAssignee={filterEmployee}
            onToggleTaskStatus={handleUpdateProjectTaskStatus}
            onUpdateStandaloneTaskStatus={handleUpdateStandaloneTaskStatus}
            onCreateStandaloneTask={handleStandaloneTaskSave}
            onEditStandaloneTask={(task) => setStandaloneEditTask(task)}
            onEditProjectTask={(projectId, stageId, task) => {
              const project = projects.find((p) => p.id === projectId);
              const stage = project?.stages.find((s) => s.id === stageId);
              setTaskModal({ task, projectId, stageId, stageName: stage?.name ?? "" });
            }}
          />
        )}

        {mounted && tab === "all-tasks" && (
          <AllTasksTab
            projects={projects}
            standaloneTasks={standaloneTasks}
            channels={channels}
            employees={employees}
            defaultFilterAssignee={filterEmployee}
            onCreateStandaloneTask={handleStandaloneTaskSave}
            onEditProjectTask={(projectId, stageId, task) => {
              const project = projects.find((p) => p.id === projectId);
              const stage = project?.stages.find((s) => s.id === stageId);
              setTaskModal({ task, projectId, stageId, stageName: stage?.name ?? "" });
            }}
            onEditStandaloneTask={(task) => setStandaloneEditTask(task)}
            onDeleteProjectTask={handleTaskDelete}
            onDeleteStandaloneTask={handleStandaloneTaskDelete}
            onUpdateProjectTaskStatus={handleUpdateProjectTaskStatus}
            onUpdateStandaloneTaskStatus={handleUpdateStandaloneTaskStatus}
          />
        )}

        {mounted && tab === "calendar" && (
          <ProjectsCalendarTab
            projects={projects}
            plans={plans}
            standaloneTasks={standaloneTasks}
            recurringTasks={recurringTasks}
            channels={channels}
            employees={employees}
            currentUser={user}
            defaultFilterAssignee={filterEmployee}
            onUpdateProjectTask={handleCalendarUpdateProjectTask}
            onUpdateStandaloneTask={handleCalendarUpdateStandaloneTask}
            onCreateStandaloneTask={handleStandaloneTaskSave}
            onEditStandaloneTask={(task) => setStandaloneEditTask(task)}
            onEditProjectTask={(projectId, stageId, task) => {
              const project = projects.find((p) => p.id === projectId);
              const stage = project?.stages.find((s) => s.id === stageId);
              setTaskModal({ task, projectId, stageId, stageName: stage?.name ?? "" });
            }}
            onToggleProjectTaskStatus={handleUpdateProjectTaskStatus}
            onToggleStandaloneTaskStatus={handleUpdateStandaloneTaskStatus}
            onUpdateStageDates={handleUpdateStageDates}
          />
        )}

        {mounted && tab === "content" && (
          <ContentProjectsTab
            employees={employees}
            currentUserEmployeeName={user?.employeeName ?? null}
            defaultFilterAssignee={filterEmployee}
            onEditProjectTask={(projectId, stageId, task) => {
              const project = projects.find((p) => p.id === projectId);
              const stage = project?.stages.find((s) => s.id === stageId);
              setTaskModal({ task, projectId, stageId, stageName: stage?.name ?? "" });
            }}
            onAddProjectTask={(projectId, stageId) => {
              const project = projects.find((p) => p.id === projectId);
              const stage = project?.stages.find((s) => s.id === stageId);
              setTaskModal({ task: null, projectId, stageId, stageName: stage?.name ?? "" });
            }}
            onToggleTaskStatus={handleUpdateProjectTaskStatus}
          />
        )}

        {mounted && tab === "recurring" && (
          <RecurringTasksTab
            tasks={recurringTasks}
            channels={channels}
            employees={employees}
            onSave={handleRecurringTaskSave}
            onDelete={handleRecurringTaskDelete}
          />
        )}
      </div>

      {/* Modals */}
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

      {standaloneEditTask && (
        <StandaloneTaskModal
          task={standaloneEditTask}
          channels={channels}
          employees={employees}
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
