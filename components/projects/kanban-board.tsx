"use client";

import { useMemo, useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import type { Project, Employee, ProjectTaskStatus } from "@/types/dashboard";

/* ─── types ──────────────────────────────────────── */

interface KanbanBoardProps {
  projects: Project[];
  employees: Employee[];
  cancelledProjectIds?: Set<number>;
  onToggleTaskStatus?: (
    projectId: number,
    stageId: number,
    taskId: number,
    status: ProjectTaskStatus,
  ) => void;
}

type KanbanColumn = "todo" | "in_progress" | "done";

interface KanbanTask {
  id: number;
  uid: string; // unique composite key
  name: string;
  description: string;
  assignee: string;
  deadline: string;
  status: KanbanColumn;
  projectId: number;
  projectName: string;
  stageId: number;
  stageName: string;
}

const COLUMN_CONFIG: {
  id: KanbanColumn;
  label: string;
  color: string;
  headerBg: string;
  dotColor: string;
  bg: string;
  dropBg: string;
}[] = [
  {
    id: "todo",
    label: "К выполнению",
    color: "text-gray-700",
    headerBg: "bg-gray-200",
    dotColor: "bg-gray-400",
    bg: "bg-gray-50/50",
    dropBg: "bg-gray-100",
  },
  {
    id: "in_progress",
    label: "В работе",
    color: "text-blue-700",
    headerBg: "bg-blue-200",
    dotColor: "bg-blue-500",
    bg: "bg-blue-50/30",
    dropBg: "bg-blue-100",
  },
  {
    id: "done",
    label: "Готово",
    color: "text-green-700",
    headerBg: "bg-green-200",
    dotColor: "bg-green-500",
    bg: "bg-green-50/30",
    dropBg: "bg-green-100",
  },
];

/* ─── Sortable card ──────────────────────────────── */

function SortableTaskCard({
  task,
  isOverdue,
  daysLeft,
}: {
  task: KanbanTask;
  isOverdue: boolean;
  daysLeft: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.uid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-xl border p-3 shadow-sm select-none transition-all duration-200 ${
        isDragging
          ? "opacity-40 scale-95 shadow-none border-dashed border-gray-300"
          : "hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
      } ${isOverdue ? "border-red-200 bg-red-50/30" : "border-gray-200"}`}
    >
      <TaskCardContent task={task} isOverdue={isOverdue} daysLeft={daysLeft} />
    </div>
  );
}

/* ─── Static card (for overlay) ──────────────────── */

function TaskCardContent({
  task,
  isOverdue,
  daysLeft,
}: {
  task: KanbanTask;
  isOverdue: boolean;
  daysLeft: number;
}) {
  return (
    <>
      <p className="text-sm font-semibold text-gray-900 mb-1.5 leading-tight">
        {task.name}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded-md">
          {task.projectName}
        </span>
        <span className="text-[10px] text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-md">
          {task.stageName}
        </span>
      </div>
      <div className="flex items-center justify-between mt-2">
        {task.assignee && (
          <span className="text-[10px] text-gray-500 font-medium">
            {task.assignee}
          </span>
        )}
        <span
          className={`text-[10px] font-semibold ${
            isOverdue
              ? "text-red-600"
              : daysLeft <= 3
                ? "text-amber-600"
                : "text-gray-400"
          }`}
        >
          {isOverdue
            ? `Просрочено на ${Math.abs(daysLeft)} дн.`
            : daysLeft === 0
              ? "Сегодня"
              : `${daysLeft} дн.`}
        </span>
      </div>
    </>
  );
}

/* ─── Droppable column ───────────────────────────── */

function DroppableColumn({
  col,
  tasks,
  children,
  isOver,
}: {
  col: (typeof COLUMN_CONFIG)[number];
  tasks: KanbanTask[];
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: col.id });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border transition-all duration-300 min-h-[250px] flex flex-col ${
        isOver
          ? `${col.dropBg} border-2 border-dashed border-gray-300 scale-[1.01]`
          : `${col.bg} border-gray-200`
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between p-3 pb-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
          <h3
            className={`text-xs font-bold uppercase tracking-wider ${col.color}`}
          >
            {col.label}
          </h3>
        </div>
        <span className="text-[10px] font-bold text-gray-400 bg-white/80 rounded-full px-2.5 py-0.5 border border-gray-100">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="p-2 flex-1 space-y-2">
        <SortableContext
          items={tasks.map((t) => t.uid)}
          strategy={verticalListSortingStrategy}
        >
          {children}
        </SortableContext>

        {tasks.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-24 text-xs text-gray-400">
            Перетащите задачу сюда
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────── */

export default function KanbanBoard({
  projects,
  employees,
  cancelledProjectIds,
  onToggleTaskStatus,
}: KanbanBoardProps) {
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null);
  const [filterToday, setFilterToday] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Flatten all tasks
  const allTasks = useMemo(() => {
    const result: KanbanTask[] = [];
    for (const project of projects) {
      if (project.cancelled || cancelledProjectIds?.has(project.id)) continue;
      if (filterProjectId !== null && project.id !== filterProjectId) continue;
      for (const stage of project.stages) {
        if (stage.cancelled) continue;
        for (const task of stage.tasks) {
          if (task.cancelled) continue;
          if (filterAssignee && task.assignee !== filterAssignee) continue;
          if (filterToday && task.deadline !== todayStr) continue;
          result.push({
            id: task.id,
            uid: `${project.id}-${stage.id}-${task.id}`,
            name: task.name,
            description: task.description,
            assignee: task.assignee,
            deadline: task.deadline,
            status: task.status as KanbanColumn,
            projectId: project.id,
            projectName: project.name,
            stageId: stage.id,
            stageName: stage.name,
          });
        }
      }
    }
    return result;
  }, [
    projects,
    filterAssignee,
    filterProjectId,
    filterToday,
    todayStr,
    cancelledProjectIds,
  ]);

  const allAssignees = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      for (const s of p.stages) {
        for (const t of s.tasks) {
          if (t.assignee) set.add(t.assignee);
        }
      }
    }
    return [...set].sort();
  }, [projects]);

  const columns = useMemo(() => {
    const map: Record<KanbanColumn, KanbanTask[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const task of allTasks) {
      map[task.status]?.push(task);
    }
    return map;
  }, [allTasks]);

  const now = new Date();

  const activeTask = activeId
    ? allTasks.find((t) => t.uid === activeId)
    : null;

  const findColumn = useCallback(
    (uid: string): KanbanColumn | null => {
      // Check if uid is a column id
      if (uid === "todo" || uid === "in_progress" || uid === "done")
        return uid;
      // Find which column the task is in
      const task = allTasks.find((t) => t.uid === uid);
      return task?.status ?? null;
    },
    [allTasks],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (over) {
        const col = findColumn(over.id as string);
        setOverColumnId(col);
      } else {
        setOverColumnId(null);
      }
    },
    [findColumn],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverColumnId(null);

      if (!over) return;

      const activeUid = active.id as string;
      const overUid = over.id as string;

      const task = allTasks.find((t) => t.uid === activeUid);
      if (!task) return;

      // Determine target column
      let targetColumn: KanbanColumn | null = null;
      if (
        overUid === "todo" ||
        overUid === "in_progress" ||
        overUid === "done"
      ) {
        targetColumn = overUid;
      } else {
        const overTask = allTasks.find((t) => t.uid === overUid);
        targetColumn = overTask?.status ?? null;
      }

      if (!targetColumn || targetColumn === task.status) return;

      onToggleTaskStatus?.(
        task.projectId,
        task.stageId,
        task.id,
        targetColumn as ProjectTaskStatus,
      );
    },
    [allTasks, onToggleTaskStatus],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverColumnId(null);
  }, []);

  // Compute daysLeft for the active drag overlay task
  const getDeadlineInfo = (task: KanbanTask) => {
    const deadlineDate = new Date(task.deadline + "T00:00:00");
    const daysLeft = Math.ceil(
      (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    const isOverdue = daysLeft < 0 && task.status !== "done";
    return { daysLeft, isOverdue };
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setFilterToday(!filterToday)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 ${
            filterToday
              ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
              : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:shadow-sm"
          }`}
        >
          Сегодня
        </button>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 font-medium whitespace-nowrap">
            Сотрудник:
          </label>
          <select
            value={filterAssignee ?? "__all__"}
            onChange={(e) =>
              setFilterAssignee(
                e.target.value === "__all__" ? null : e.target.value,
              )
            }
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[180px]"
          >
            <option value="__all__">Все сотрудники</option>
            {allAssignees.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 font-medium whitespace-nowrap">
            Проект:
          </label>
          <select
            value={filterProjectId ?? "__all__"}
            onChange={(e) =>
              setFilterProjectId(
                e.target.value === "__all__" ? null : Number(e.target.value),
              )
            }
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[180px]"
          >
            <option value="__all__">Все проекты</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban columns with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMN_CONFIG.map((col) => {
            const tasks = columns[col.id];
            const isOver = overColumnId === col.id && activeId !== null;
            return (
              <DroppableColumn
                key={col.id}
                col={col}
                tasks={tasks}
                isOver={isOver}
              >
                {tasks.map((task) => {
                  const { daysLeft, isOverdue } = getDeadlineInfo(task);
                  return (
                    <SortableTaskCard
                      key={task.uid}
                      task={task}
                      isOverdue={isOverdue}
                      daysLeft={daysLeft}
                    />
                  );
                })}
              </DroppableColumn>
            );
          })}
        </div>

        {/* Drag overlay — follows the cursor smoothly */}
        <DragOverlay dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}>
          {activeTask ? (
            <div className="bg-white rounded-xl border border-indigo-300 p-3 shadow-2xl shadow-indigo-200/50 rotate-[2deg] scale-105 opacity-95 w-[280px]">
              <TaskCardContent
                task={activeTask}
                isOverdue={getDeadlineInfo(activeTask).isOverdue}
                daysLeft={getDeadlineInfo(activeTask).daysLeft}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
