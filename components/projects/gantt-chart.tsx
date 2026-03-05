"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { Project, Plan, PlanItem, StandaloneTask, ProjectTaskStatus, StandaloneTaskStatus } from "@/types/dashboard";
import { calcProjectCompletion } from "@/lib/project-utils";
import { PLAN_ITEM_COLORS } from "@/lib/plan-colors";

// ─── Types ────────────────────────────────────────────────────────

type GanttMode = "projects" | "planItems" | "tasks";

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
}

interface GanttChartProps {
  projects: Project[];
  plans: Plan[];
  standaloneTasks?: StandaloneTask[];
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
const LEFT_COL_WIDTH = 192; // w-48

// ─── Helpers ──────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Returns 0 = Mon, 1 = Tue, ... 6 = Sun (ISO weekday) */
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

// ─── Component ────────────────────────────────────────────────────

// Status colors for tasks
const TASK_STATUS_COLORS: Record<string, string> = {
  todo: "#94a3b8",       // gray-400
  in_progress: "#6366f1", // indigo-500
  done: "#22c55e",        // green-500
};

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  done: "Готово",
};

export default function GanttChart({ projects, plans, standaloneTasks = [], onToggleProjectTaskStatus, onToggleStandaloneTaskStatus }: GanttChartProps) {
  const [mode, setMode] = useState<GanttMode>("projects");
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const totalWidth = daysInMonth * DAY_WIDTH;
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);

  // ── Build bars ────────────────────────────────────────────────

  const bars: GanttBar[] = useMemo(() => {
    if (mode === "projects") {
      return projects
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

    if (mode === "tasks") {
      const taskBars: GanttBar[] = [];
      const mStart = monthStart.getTime();
      const mEnd = monthEnd.getTime() + 86400000;

      // Project tasks — only those with deadline in the visible month
      for (const project of projects) {
        for (const stage of project.stages) {
          for (const task of stage.tasks) {
            const end = parseLocalDate(task.deadline);
            if (end.getTime() < mStart || end.getTime() >= mEnd) continue;
            taskBars.push({
              id: `p-${project.id}-${stage.id}-${task.id}`,
              name: task.name,
              startDate: end,
              endDate: end,
              color: TASK_STATUS_COLORS[task.status] || TASK_STATUS_COLORS.todo,
              responsible: task.assignee,
              status: task.status,
              source: "project",
              _projectId: project.id,
              _stageId: stage.id,
              _taskId: task.id,
              projectName: project.name,
            });
          }
        }
      }

      // Standalone tasks — only those with deadline in the visible month
      for (const task of standaloneTasks) {
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
  }, [mode, projects, plans, standaloneTasks, year, month]);

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

  function getBarStyle(bar: GanttBar) {
    const msPerDay = 86400000;
    const monthStartMs = monthStart.getTime();
    const monthEndMs = monthEnd.getTime() + msPerDay; // end of last day

    const barStartMs = bar.startDate.getTime();
    const barEndMs = bar.endDate.getTime() + msPerDay; // include end day

    // Clamp to month boundaries
    const visibleStartMs = Math.max(barStartMs, monthStartMs);
    const visibleEndMs = Math.min(barEndMs, monthEndMs);

    if (visibleStartMs >= visibleEndMs) return null; // bar not visible

    const leftPx = ((visibleStartMs - monthStartMs) / msPerDay) * DAY_WIDTH;
    const widthPx = ((visibleEndMs - visibleStartMs) / msPerDay) * DAY_WIDTH;

    return { left: leftPx, width: Math.max(widthPx, 4) };
  }

  // ── Render ────────────────────────────────────────────────────

  const totalBodyHeight = Math.max(bars.length * ROW_HEIGHT, ROW_HEIGHT);

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      {/* ── Header bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50/60">
        {/* Mode toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setMode("projects")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === "projects"
                ? "bg-white shadow text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Проекты
          </button>
          <button
            onClick={() => setMode("planItems")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === "planItems"
                ? "bg-white shadow text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Пункты плана
          </button>
          <button
            onClick={() => setMode("tasks")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === "tasks"
                ? "bg-white shadow text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Задачи
          </button>
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
                title={bar.name + (bar.projectName ? ` (${bar.projectName})` : "")}
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
                <span className={`truncate ${bar.status === "done" ? "line-through text-gray-400" : "font-medium"}`}>
                  {bar.name}
                </span>
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
                  const barStyle = getBarStyle(bar);
                  if (!barStyle) return null;

                  const topOffset = i * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;
                  const showLabel = barStyle.width > 100;
                  const isDone = bar.status === "done";

                  const barTitle = mode === "tasks"
                    ? `${bar.name} — ${TASK_STATUS_LABELS[bar.status ?? "todo"] ?? bar.status}${bar.responsible ? ` (${bar.responsible})` : ""}${bar.projectName ? ` · ${bar.projectName}` : ""}`
                    : `${bar.name}${bar.completion !== undefined ? ` (${bar.completion}%)` : ""}`;

                  return (
                    <div
                      key={bar.id}
                      className={`absolute rounded-md shadow-sm flex items-center px-2 text-xs text-white font-medium overflow-hidden z-10 ${
                        isDone ? "opacity-50" : ""
                      }`}
                      style={{
                        left: barStyle.left,
                        width: barStyle.width,
                        top: topOffset,
                        height: BAR_HEIGHT,
                        backgroundColor: bar.color,
                      }}
                      title={barTitle}
                    >
                      {showLabel && (
                        <span className={`truncate ${isDone ? "line-through" : ""}`}>
                          {bar.name}
                          {mode === "projects" &&
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
