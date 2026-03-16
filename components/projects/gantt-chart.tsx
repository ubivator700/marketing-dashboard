"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { Project, Plan, PlanItem, StandaloneTask, ProjectTaskStatus, StandaloneTaskStatus, Employee } from "@/types/dashboard";
import { calcProjectCompletion } from "@/lib/project-utils";
import { PLAN_ITEM_COLORS } from "@/lib/plan-colors";

// ─── Types ────────────────────────────────────────────────────────

type GanttMode = "projects" | "planItems" | "stages" | "tasks";

interface GanttBar {
  id: number | string;
  name: string;
  startDate: Date;
  endDate: Date;
  color: string;
  completion?: number;
  responsible?: string;
  // Task-specific fields
  status?: string;
  source?: "project" | "standalone";
  _projectId?: number;
  _stageId?: number;
  _taskId?: number;
  projectName?: string;
  stageName?: string;
  // For grouping
  indent?: number;
}

interface GanttChartProps {
  projects: Project[];
  plans: Plan[];
  standaloneTasks?: StandaloneTask[];
  employees?: Employee[];
  onToggleProjectTaskStatus?: (
    projectId: number,
    stageId: number,
    taskId: number,
    status: ProjectTaskStatus
  ) => void;
  onToggleStandaloneTaskStatus?: (
    taskId: number,
    status: StandaloneTaskStatus
  ) => void;
  onUpdateProjectTaskDeadline?: (
    projectId: number,
    stageId: number,
    taskId: number,
    newDeadline: string
  ) => void;
  onUpdateStandaloneTaskDeadline?: (
    taskId: number,
    newDeadline: string
  ) => void;
  onUpdateStageDates?: (
    projectId: number,
    stageId: number,
    updates: { startDate?: string; deadline?: string }
  ) => void;
}

// ─── Constants ────────────────────────────────────────────────────

const MONTH_NAMES_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const DAY_NAMES_SHORT_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const DAY_WIDTH = 40;
const ROW_HEIGHT = 40;
const BAR_HEIGHT = 28;
const LEFT_COL_WIDTH = 220;

// ─── Helpers ──────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getISOWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Component ────────────────────────────────────────────────────

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: "#94a3b8",
  in_progress: "#6366f1",
  done: "#22c55e",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  done: "Готово",
};

const STAGE_COLOR = "#8b5cf6"; // violet-500

export default function GanttChart({
  projects,
  plans,
  standaloneTasks = [],
  employees = [],
  onToggleProjectTaskStatus,
  onToggleStandaloneTaskStatus,
  onUpdateProjectTaskDeadline,
  onUpdateStandaloneTaskDeadline,
  onUpdateStageDates,
}: GanttChartProps) {
  const [mode, setMode] = useState<GanttMode>("projects");
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const [filterAssignee, setFilterAssignee] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Drag state (move entire bar)
  const [dragBar, setDragBar] = useState<{ barId: string | number; startX: number; origStartDate: Date; origEndDate: Date } | null>(null);
  const [dragOffsetDays, setDragOffsetDays] = useState(0);

  // Resize state (stretch bar from right edge)
  const [resizeBar, setResizeBar] = useState<{ barId: string | number; startX: number; origEndDate: Date; origStartDate: Date; edge: "left" | "right" } | null>(null);
  const [resizeOffsetDays, setResizeOffsetDays] = useState(0);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const totalWidth = daysInMonth * DAY_WIDTH;
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);

  // ── Collect all unique assignees ──
  const allAssignees = useMemo(() => {
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
    for (const e of employees) {
      set.add(e.name);
    }
    return Array.from(set).sort();
  }, [projects, standaloneTasks, employees]);

  // ── Build bars ────────────────────────────────────────────────

  const bars: GanttBar[] = useMemo(() => {
    const matchesFilter = (assignee?: string) =>
      !filterAssignee || assignee === filterAssignee;

    if (mode === "projects") {
      return projects
        .filter((p) => matchesFilter(p.responsible))
        .map((p) => {
          const end = parseLocalDate(p.deadline);
          const start = p.startDate ? parseLocalDate(p.startDate) : end;
          return {
            id: p.id,
            name: p.name,
            startDate: start,
            endDate: end,
            color: "#6366f1",
            completion: calcProjectCompletion(p),
            responsible: p.responsible,
          };
        })
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    }

    if (mode === "stages") {
      const stageBars: GanttBar[] = [];
      for (const project of projects) {
        for (const stage of project.stages) {
          // Filter by assignee: check if any task in stage matches
          const hasMatchingTask = !filterAssignee ||
            stage.tasks.some((t) => t.assignee === filterAssignee);
          if (!hasMatchingTask && filterAssignee) continue;

          const end = parseLocalDate(stage.deadline);
          const start = stage.startDate ? parseLocalDate(stage.startDate) : end;
          const doneTasks = stage.tasks.filter((t) => t.status === "done").length;
          const totalTasks = stage.tasks.length;
          const completion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

          stageBars.push({
            id: `stage-${project.id}-${stage.id}`,
            name: stage.name,
            startDate: start,
            endDate: end,
            color: STAGE_COLOR,
            completion,
            responsible: project.responsible,
            projectName: project.name,
            _projectId: project.id,
            _stageId: stage.id,
          });
        }
      }
      return stageBars.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    }

    if (mode === "tasks") {
      const taskBars: GanttBar[] = [];
      const mStart = monthStart.getTime();
      const mEnd = monthEnd.getTime() + 86400000;

      for (const project of projects) {
        for (const stage of project.stages) {
          for (const task of stage.tasks) {
            if (!matchesFilter(task.assignee)) continue;
            const end = parseLocalDate(task.deadline);
            if (end.getTime() < mStart || end.getTime() >= mEnd) continue;
            taskBars.push({
              id: `p-${project.id}-${stage.id}-${task.id}`,
              name: task.name,
              startDate: task.startDate ? parseLocalDate(task.startDate) : end,
              endDate: end,
              color: TASK_STATUS_COLORS[task.status] || TASK_STATUS_COLORS.todo,
              responsible: task.assignee,
              status: task.status,
              source: "project",
              _projectId: project.id,
              _stageId: stage.id,
              _taskId: task.id,
              projectName: project.name,
              stageName: stage.name,
            });
          }
        }
      }

      for (const task of standaloneTasks) {
        if (!matchesFilter(task.assignee)) continue;
        const end = parseLocalDate(task.deadline);
        if (end.getTime() < mStart || end.getTime() >= mEnd) continue;
        taskBars.push({
          id: `s-${task.id}`,
          name: task.name,
          startDate: end,
          endDate: end,
          color: TASK_STATUS_COLORS[task.status] || TASK_STATUS_COLORS.todo,
          responsible: task.assignee,
          status: task.status,
          source: "standalone",
          _taskId: task.id,
        });
      }

      return taskBars.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    }

    // planItems mode
    const items: { item: PlanItem }[] = [];
    for (const plan of plans) {
      for (const item of plan.items) {
        if (!matchesFilter(item.responsible)) continue;
        items.push({ item });
      }
    }

    return items
      .map(({ item }) => {
        const end = parseLocalDate(item.deadline);
        const start = item.startDate ? parseLocalDate(item.startDate) : end;
        const colorDef = PLAN_ITEM_COLORS[item.color] || PLAN_ITEM_COLORS.blue;
        return {
          id: item.id,
          name: item.name,
          startDate: start,
          endDate: end,
          color: colorDef.hex,
          responsible: item.responsible,
        };
      })
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, projects, plans, standaloneTasks, year, month, filterAssignee]);

  // ── Today info ────────────────────────────────────────────────

  const today = new Date();
  const todayInMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const todayX = todayInMonth
    ? (today.getDate() - 1) * DAY_WIDTH + DAY_WIDTH / 2
    : -1;

  // ── Auto-scroll to today ──────────────────────────────────────

  useEffect(() => {
    if (todayInMonth && scrollRef.current) {
      const container = scrollRef.current;
      const scrollTarget = todayX - container.clientWidth / 2;
      container.scrollLeft = Math.max(0, scrollTarget);
    }
  }, [todayInMonth, todayX, year, month]);

  // ── Navigation handlers ───────────────────────────────────────

  function prevMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function nextMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  function goToday() {
    setViewDate(new Date());
  }

  // ── Day columns metadata ──────────────────────────────────────

  const dayColumns = useMemo(() => {
    const cols: { day: number; weekday: number; isWeekend: boolean; isMonday: boolean }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const wd = getISOWeekday(date);
      cols.push({
        day: d,
        weekday: wd,
        isWeekend: wd >= 5,
        isMonday: wd === 0,
      });
    }
    return cols;
  }, [year, month, daysInMonth]);

  // ── Bar positioning ───────────────────────────────────────────

  function getBarStyle(bar: GanttBar, moveOffsetDays = 0, resizeInfo?: { edge: "left" | "right"; offsetDays: number }) {
    const msPerDay = 86400000;
    const monthStartMs = monthStart.getTime();
    const monthEndMs = monthEnd.getTime() + msPerDay;

    let barStartMs = bar.startDate.getTime() + moveOffsetDays * msPerDay;
    let barEndMs = bar.endDate.getTime() + msPerDay + moveOffsetDays * msPerDay;

    if (resizeInfo) {
      if (resizeInfo.edge === "right") {
        barEndMs += resizeInfo.offsetDays * msPerDay;
      } else {
        barStartMs += resizeInfo.offsetDays * msPerDay;
      }
    }

    const visibleStartMs = Math.max(barStartMs, monthStartMs);
    const visibleEndMs = Math.min(barEndMs, monthEndMs);

    if (visibleStartMs >= visibleEndMs) return null;

    const leftPx = ((visibleStartMs - monthStartMs) / msPerDay) * DAY_WIDTH;
    const widthPx = ((visibleEndMs - visibleStartMs) / msPerDay) * DAY_WIDTH;

    return { left: leftPx, width: Math.max(widthPx, 4) };
  }

  // ── Drag handlers ─────────────────────────────────────────────

  const canDrag = mode === "tasks" || mode === "stages";

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, bar: GanttBar) => {
      if (!canDrag) return;
      e.preventDefault();
      setDragBar({ barId: bar.id, startX: e.clientX, origStartDate: bar.startDate, origEndDate: bar.endDate });
      setDragOffsetDays(0);
    },
    [canDrag]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, bar: GanttBar, edge: "left" | "right") => {
      if (!canDrag) return;
      e.preventDefault();
      e.stopPropagation();
      setResizeBar({ barId: bar.id, startX: e.clientX, origEndDate: bar.endDate, origStartDate: bar.startDate, edge });
      setResizeOffsetDays(0);
    },
    [canDrag]
  );

  // Drag move effect
  useEffect(() => {
    if (!dragBar) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragBar.startX;
      const days = Math.round(dx / DAY_WIDTH);
      setDragOffsetDays(days);
    };

    const handleMouseUp = () => {
      if (dragOffsetDays !== 0) {
        const barId = String(dragBar.barId);

        if (barId.startsWith("p-") && onUpdateProjectTaskDeadline) {
          const parts = barId.split("-");
          const projectId = parseInt(parts[1], 10);
          const stageId = parseInt(parts[2], 10);
          const taskId = parseInt(parts[3], 10);
          const newDate = new Date(dragBar.origEndDate.getTime() + dragOffsetDays * 86400000);
          onUpdateProjectTaskDeadline(projectId, stageId, taskId, formatDateKey(newDate));
        } else if (barId.startsWith("s-") && onUpdateStandaloneTaskDeadline) {
          const taskId = parseInt(barId.replace("s-", ""), 10);
          const newDate = new Date(dragBar.origEndDate.getTime() + dragOffsetDays * 86400000);
          onUpdateStandaloneTaskDeadline(taskId, formatDateKey(newDate));
        } else if (barId.startsWith("stage-") && onUpdateStageDates) {
          const parts = barId.split("-");
          const projectId = parseInt(parts[1], 10);
          const stageId = parseInt(parts[2], 10);
          const newStart = new Date(dragBar.origStartDate.getTime() + dragOffsetDays * 86400000);
          const newEnd = new Date(dragBar.origEndDate.getTime() + dragOffsetDays * 86400000);
          onUpdateStageDates(projectId, stageId, { startDate: formatDateKey(newStart), deadline: formatDateKey(newEnd) });
        }
      }
      setDragBar(null);
      setDragOffsetDays(0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragBar, dragOffsetDays, onUpdateProjectTaskDeadline, onUpdateStandaloneTaskDeadline, onUpdateStageDates]);

  // Resize effect
  useEffect(() => {
    if (!resizeBar) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeBar.startX;
      const days = Math.round(dx / DAY_WIDTH);
      setResizeOffsetDays(days);
    };

    const handleMouseUp = () => {
      if (resizeOffsetDays !== 0) {
        const barId = String(resizeBar.barId);

        if (barId.startsWith("stage-") && onUpdateStageDates) {
          const parts = barId.split("-");
          const projectId = parseInt(parts[1], 10);
          const stageId = parseInt(parts[2], 10);
          if (resizeBar.edge === "right") {
            const newEnd = new Date(resizeBar.origEndDate.getTime() + resizeOffsetDays * 86400000);
            onUpdateStageDates(projectId, stageId, { deadline: formatDateKey(newEnd) });
          } else {
            const newStart = new Date(resizeBar.origStartDate.getTime() + resizeOffsetDays * 86400000);
            onUpdateStageDates(projectId, stageId, { startDate: formatDateKey(newStart) });
          }
        }
      }
      setResizeBar(null);
      setResizeOffsetDays(0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizeBar, resizeOffsetDays, onUpdateStageDates]);

  // ── Render ────────────────────────────────────────────────────

  const totalBodyHeight = Math.max(bars.length * ROW_HEIGHT, ROW_HEIGHT);

  return (
    <div className="border border-gray-200 rounded-xl bg-white">
      {/* ── Header bar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50/60">
        {/* Mode toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          {(["projects", "planItems", "stages", "tasks"] as GanttMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                mode === m
                  ? "bg-white shadow text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {m === "projects" ? "Проекты" : m === "planItems" ? "Пункты плана" : m === "stages" ? "Этапы" : "Задачи"}
            </button>
          ))}
        </div>

        {/* Employee filter */}
        <div className="flex items-center gap-2">
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Все сотрудники</option>
            {allAssignees.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* Month nav */}
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="text-gray-500 hover:text-gray-700 transition-colors text-sm"
          >
            ◀
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[140px] text-center">
            {MONTH_NAMES_RU[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="text-gray-500 hover:text-gray-700 transition-colors text-sm"
          >
            ▶
          </button>
        </div>

        {/* Today button */}
        <button
          onClick={goToday}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Сегодня
        </button>
      </div>

      {/* ── Main area ──────────────────────────────────────────── */}
      {bars.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-sm text-gray-400">
          Нет данных для отображения
        </div>
      ) : (
        <div className="flex">
          {/* Left column (entity names) */}
          <div
            className="flex-shrink-0 bg-white border-r border-gray-200 z-10"
            style={{ width: LEFT_COL_WIDTH }}
          >
            {/* Spacer for day headers */}
            <div
              className="border-b border-gray-200"
              style={{ height: ROW_HEIGHT }}
            />
            {/* Entity rows */}
            {bars.map((bar) => (
              <div
                key={bar.id}
                className={`flex items-center gap-1.5 px-3 border-b border-gray-100 text-sm text-gray-700 truncate ${
                  bar.status === "done" ? "opacity-60" : ""
                }`}
                style={{ height: ROW_HEIGHT }}
                title={bar.name + (bar.projectName ? ` (${bar.projectName})` : "") + (bar.responsible ? ` — ${bar.responsible}` : "")}
              >
                {/* Checkbox for tasks mode */}
                {mode === "tasks" && bar.status != null && (
                  <button
                    onClick={() => {
                      const newStatus = bar.status === "done" ? "todo" : "done";
                      if (bar.source === "project" && onToggleProjectTaskStatus && bar._projectId != null && bar._stageId != null && bar._taskId != null) {
                        onToggleProjectTaskStatus(bar._projectId, bar._stageId, bar._taskId, newStatus as ProjectTaskStatus);
                      } else if (bar.source === "standalone" && onToggleStandaloneTaskStatus && bar._taskId != null) {
                        onToggleStandaloneTaskStatus(bar._taskId, newStatus as StandaloneTaskStatus);
                      }
                    }}
                    className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
                      bar.status === "done"
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50"
                    }`}
                    title={bar.status === "done" ? "Отменить выполнение" : "Отметить выполненной"}
                  >
                    {bar.status === "done" && (
                      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                )}
                <div className="flex flex-col min-w-0">
                  <span className={`truncate ${bar.status === "done" ? "line-through text-gray-400" : "font-medium"} text-xs`}>
                    {bar.name}
                  </span>
                  {(mode === "tasks" || mode === "stages") && bar.projectName && (
                    <span className="text-[10px] text-gray-400 truncate">{bar.projectName}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Right area (scrollable timeline) */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto">
            <div style={{ width: totalWidth, minWidth: "100%" }}>
              {/* Day headers row */}
              <div
                className="flex border-b border-gray-200"
                style={{ height: ROW_HEIGHT }}
              >
                {dayColumns.map((col) => (
                  <div
                    key={col.day}
                    className={`flex flex-col items-center justify-center flex-shrink-0 ${
                      col.isWeekend ? "text-gray-400" : "text-gray-500"
                    } ${
                      col.isMonday
                        ? "border-r border-gray-200"
                        : "border-r border-gray-100"
                    }`}
                    style={{ width: DAY_WIDTH }}
                  >
                    <span className="text-xs font-medium leading-tight">
                      {col.day}
                    </span>
                    <span className="text-[10px] leading-tight">
                      {DAY_NAMES_SHORT_RU[col.weekday]}
                    </span>
                  </div>
                ))}
              </div>

              {/* Body rows */}
              <div className="relative" style={{ height: totalBodyHeight }}>
                {/* Background columns (weekends, grid lines) */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {dayColumns.map((col) => (
                    <div
                      key={col.day}
                      className={`flex-shrink-0 ${
                        col.isWeekend ? "bg-gray-50/50" : ""
                      } ${
                        col.isMonday
                          ? "border-r border-gray-200"
                          : "border-r border-gray-100"
                      }`}
                      style={{ width: DAY_WIDTH, height: "100%" }}
                    />
                  ))}
                </div>

                {/* Row dividers */}
                {bars.map((_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-b border-gray-100"
                    style={{ top: (i + 1) * ROW_HEIGHT }}
                  />
                ))}

                {/* Today line */}
                {todayInMonth && (
                  <div
                    className="absolute top-0 z-20 pointer-events-none"
                    style={{
                      left: todayX,
                      height: totalBodyHeight,
                      borderLeft: "2px dashed #ef4444",
                    }}
                  />
                )}

                {/* Bars */}
                {bars.map((bar, i) => {
                  const isDragging = dragBar?.barId === bar.id;
                  const isResizing = resizeBar?.barId === bar.id;
                  const moveOffset = isDragging ? dragOffsetDays : 0;
                  const resizeInfo = isResizing ? { edge: resizeBar!.edge, offsetDays: resizeOffsetDays } : undefined;
                  const barStyle = getBarStyle(bar, moveOffset, resizeInfo);
                  if (!barStyle) return null;

                  const topOffset = i * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;
                  const showLabel = barStyle.width > 100;
                  const isDone = bar.status === "done";
                  const isStageMode = mode === "stages";

                  const barTitle = mode === "tasks"
                    ? `${bar.name} — ${TASK_STATUS_LABELS[bar.status ?? "todo"] ?? bar.status}${bar.responsible ? ` (${bar.responsible})` : ""}${bar.projectName ? ` · ${bar.projectName}` : ""}`
                    : mode === "stages"
                    ? `${bar.name}${bar.projectName ? ` · ${bar.projectName}` : ""}${bar.completion !== undefined ? ` (${bar.completion}%)` : ""}`
                    : `${bar.name}${bar.completion !== undefined ? ` (${bar.completion}%)` : ""}`;

                  return (
                    <div
                      key={bar.id}
                      className={`absolute rounded-md shadow-sm flex items-center text-xs text-white font-medium overflow-hidden z-10 ${
                        isDone ? "opacity-50" : ""
                      } ${canDrag ? "cursor-grab active:cursor-grabbing" : ""} ${isDragging || isResizing ? "opacity-70 ring-2 ring-indigo-400" : ""}`}
                      style={{
                        left: barStyle.left,
                        width: barStyle.width,
                        top: topOffset,
                        height: BAR_HEIGHT,
                        backgroundColor: bar.color,
                      }}
                      title={barTitle}
                      onMouseDown={(e) => handleMouseDown(e, bar)}
                    >
                      {/* Left resize handle for stages */}
                      {isStageMode && barStyle.width > 20 && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 z-20"
                          onMouseDown={(e) => handleResizeMouseDown(e, bar, "left")}
                        />
                      )}

                      <div className="px-2 flex-1 min-w-0">
                        {showLabel && (
                          <span className={`truncate ${isDone ? "line-through" : ""}`}>
                            {bar.name}
                            {(mode === "projects" || mode === "stages") &&
                              bar.completion !== undefined && (
                                <span className="ml-1.5 bg-white/25 rounded px-1 py-0.5 text-[10px]">
                                  {bar.completion}%
                                </span>
                              )}
                            {mode === "tasks" && bar.status && (
                              <span className="ml-1.5 bg-white/25 rounded px-1 py-0.5 text-[10px]">
                                {TASK_STATUS_LABELS[bar.status] ?? bar.status}
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Right resize handle for stages */}
                      {isStageMode && barStyle.width > 20 && (
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 z-20"
                          onMouseDown={(e) => handleResizeMouseDown(e, bar, "right")}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
