"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import type {
  Project,
  Plan,
  ProjectTask,
  StandaloneTask,
  RecurringTask,
  Channel,
  Employee,
  StandaloneTaskStatus,
} from "@/types/dashboard";
import type { AuthUser } from "@/lib/auth-context";
import {
  projectTaskStatusLabels,
  projectTaskStatusColors,
} from "@/lib/projects-data";
import { generateInstances } from "@/lib/recurring-utils";
import { layoutOverlappingItems, type LayoutItem } from "@/lib/calendar-layout";
import GanttChart from "./gantt-chart";
import CalendarQuickAddModal from "./calendar-quick-add-modal";

// ─── Types ───────────────────────────────────────────────────────────
type CalendarView = "week" | "day" | "month" | "gantt";

interface ProjectsCalendarTabProps {
  projects: Project[];
  plans: Plan[];
  standaloneTasks: StandaloneTask[];
  recurringTasks?: RecurringTask[];
  channels: Channel[];
  employees: Employee[];
  currentUser: AuthUser | null;
  onUpdateProjectTask?: (
    projectId: number,
    stageId: number,
    taskId: number,
    updates: { deadline?: string; dueTime?: string; duration?: number }
  ) => void;
  onUpdateStandaloneTask?: (
    taskId: number,
    updates: { deadline?: string; dueTime?: string; duration?: number }
  ) => void;
  onCreateStandaloneTask?: (task: StandaloneTask) => void;
  onToggleProjectTaskStatus?: (
    projectId: number,
    stageId: number,
    taskId: number,
    status: import("@/types/dashboard").ProjectTaskStatus
  ) => void;
  onToggleStandaloneTaskStatus?: (
    taskId: number,
    status: import("@/types/dashboard").StandaloneTaskStatus
  ) => void;
}

/** Unified calendar item: project task or standalone task. */
interface CalendarItem {
  id: string; // unique key: "p-<projectId>-<stageId>-<taskId>" or "s-<taskId>"
  name: string;
  description: string;
  assignee: string;
  deadline: string; // "YYYY-MM-DD"
  dueTime?: string; // "HH:MM"
  duration?: number; // minutes
  status: string;
  statusLabel: string;
  statusColor: string;
  source: "project" | "standalone" | "recurring";
  projectName?: string;
  channelName?: string;
  color: string; // block color
  // Extra ids for update callbacks
  _projectId?: number;
  _stageId?: number;
  _taskId?: number;
}

/** Drag state while a task block is being moved */
interface DragState {
  item: CalendarItem;
  /** Offset from top of the block where mouse was pressed, in px */
  offsetY: number;
  /** Current target date key "YYYY-MM-DD" */
  currentDateKey: string;
  /** Current target start-of-task minute (absolute, e.g. 600 = 10:00) */
  currentMinute: number;
  /** Whether pointer has actually moved (to distinguish click from drag) */
  hasMoved: boolean;
}

/** Resize state while a task block is being resized from top/bottom edge */
interface ResizeState {
  item: CalendarItem;
  dateKey: string;
  edge: "top" | "bottom";
  /** Original start minute from dueTime */
  originalStartMinute: number;
  /** Original duration in minutes */
  originalDuration: number;
  /** Current computed start minute */
  currentStartMinute: number;
  /** Current computed duration */
  currentDuration: number;
  hasMoved: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────
const HOUR_HEIGHT = 60; // px per hour row
const START_HOUR = 8;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const GUTTER_WIDTH = 60; // px – matches the time gutter column

const DAY_NAMES_FULL_RU = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];

const DAY_NAMES_SHORT_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const standaloneTaskStatusLabels: Record<StandaloneTaskStatus, string> = {
  todo: "К выполнению",
  in_progress: "В работе",
  done: "Готово",
};

const standaloneTaskStatusColors: Record<StandaloneTaskStatus, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

// Color palette for project tasks vs standalone tasks vs recurring tasks
const PROJECT_TASK_COLOR = "#6366f1"; // indigo-500
const STANDALONE_TASK_COLOR = "#14b8a6"; // teal-500
const RECURRING_TASK_COLOR = "#f59e0b"; // amber-500

// ─── Helpers ─────────────────────────────────────────────────────────
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function dateKeyFromDate(d: Date): string {
  return formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
  }
  return `${minutes} мин`;
}

function formatDurationShort(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}ч${mins}м` : `${hours}ч`;
  }
  return `${minutes}м`;
}

/** Round minutes to nearest 15 */
function roundTo15(min: number): number {
  return Math.round(min / 15) * 15;
}

/** Format minutes-of-day (e.g. 615) to "HH:MM" */
function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ─── Month view helpers ──────────────────────────────────────────────
const MONTH_NAMES_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const PROJECT_PALETTE = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#64748b",
];

/** Build 42 dates (6 weeks) for a calendar grid starting from Monday. */
function getMonthGridDates(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay(); // 0=Sun
  const startOffset = startDow === 0 ? -6 : 1 - startDow;
  const gridStart = new Date(year, month, 1 + startOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

interface MonthProjectItem {
  type: "project" | "stage";
  name: string;
  projectName: string;
  color: string;
  projectId: number;
}

// ─── Component ───────────────────────────────────────────────────────
export default function ProjectsCalendarTab({
  projects,
  plans,
  standaloneTasks,
  recurringTasks = [],
  channels,
  employees,
  currentUser,
  onUpdateProjectTask,
  onUpdateStandaloneTask,
  onCreateStandaloneTask,
  onToggleProjectTaskStatus,
  onToggleStandaloneTaskStatus,
}: ProjectsCalendarTabProps) {
  const [view, setView] = useState<CalendarView>("week");
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [monthViewDate, setMonthViewDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Quick-add task from calendar click
  const [quickAddState, setQuickAddState] = useState<{
    date: string; // "YYYY-MM-DD"
    time?: string; // "HH:MM"
  } | null>(null);

  // Drag-and-drop state
  const [dragState, setDragState] = useState<DragState | null>(null);
  // Resize state (top/bottom edge drag)
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const allDayGridRef = useRef<HTMLDivElement>(null);

  // ─── Filters (defaults) ───
  const [filterAssignee, setFilterAssignee] = useState<string | null>(
    () => currentUser?.employeeName ?? null
  );
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null);
  const [filterChannelId, setFilterChannelId] = useState<number | null>(null);

  const today = new Date();
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  // ─── Close popup on outside click ───
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setSelectedItem(null);
      }
    }
    if (selectedItem) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedItem]);

  // ─── Build channel name lookup ───
  const channelNameMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const ch of channels) {
      map.set(ch.id, ch.name);
    }
    return map;
  }, [channels]);

  // ─── Build project name lookup ───
  const projectNameMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of projects) {
      map.set(p.id, p.name);
    }
    return map;
  }, [projects]);

  // ─── Build employee color lookup ───
  const employeeColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const emp of employees) {
      map.set(emp.name, emp.color);
    }
    return map;
  }, [employees]);

  // ─── Unique assignees from all tasks ───
  const allAssignees = useMemo(() => {
    const set = new Set<string>();
    for (const project of projects) {
      for (const stage of project.stages) {
        for (const task of stage.tasks) {
          if (task.assignee) set.add(task.assignee);
        }
      }
    }
    for (const task of standaloneTasks) {
      if (task.assignee) set.add(task.assignee);
    }
    return Array.from(set).sort();
  }, [projects, standaloneTasks]);

  // ─── Build unified calendar items (filtered) ───
  const calendarItems = useMemo(() => {
    const items: CalendarItem[] = [];

    // Project tasks
    for (const project of projects) {
      if (filterProjectId !== null && project.id !== filterProjectId) continue;
      for (const stage of project.stages) {
        for (const task of stage.tasks) {
          if (filterAssignee && task.assignee !== filterAssignee) continue;
          const empColor = employeeColorMap.get(task.assignee);
          items.push({
            id: `p-${project.id}-${stage.id}-${task.id}`,
            name: task.name,
            description: task.description,
            assignee: task.assignee,
            deadline: task.deadline,
            dueTime: task.dueTime,
            duration: task.duration,
            status: task.status,
            statusLabel: projectTaskStatusLabels[task.status],
            statusColor: projectTaskStatusColors[task.status],
            source: "project",
            projectName: project.name,
            channelName: undefined,
            color: empColor || PROJECT_TASK_COLOR,
            _projectId: project.id,
            _stageId: stage.id,
            _taskId: task.id,
          });
        }
      }
    }

    // Standalone tasks
    for (const task of standaloneTasks) {
      if (filterAssignee && task.assignee !== filterAssignee) continue;
      if (filterChannelId !== null && task.channelId !== filterChannelId) continue;
      // If project filter is active, skip standalone tasks (they are not project tasks)
      // but only if the project filter is set to a specific project
      if (filterProjectId !== null) continue;

      const channelName = task.channelId ? channelNameMap.get(task.channelId) : undefined;
      const empColor = employeeColorMap.get(task.assignee);
      items.push({
        id: `s-${task.id}`,
        name: task.name,
        description: task.description,
        assignee: task.assignee,
        deadline: task.deadline,
        dueTime: task.dueTime,
        duration: task.duration,
        status: task.status,
        statusLabel: standaloneTaskStatusLabels[task.status as StandaloneTaskStatus],
        statusColor: standaloneTaskStatusColors[task.status as StandaloneTaskStatus],
        source: "standalone",
        projectName: undefined,
        channelName: channelName,
        color: empColor || STANDALONE_TASK_COLOR,
        _taskId: task.id,
      });
    }

    // Recurring tasks — generate virtual instances for visible range
    if (recurringTasks.length > 0 && filterProjectId === null) {
      // Compute a generous range: 2 weeks before weekStart to 2 weeks after
      const rangeStart = new Date(weekStart);
      rangeStart.setDate(rangeStart.getDate() - 14);
      const rangeEnd = new Date(weekStart);
      rangeEnd.setDate(rangeEnd.getDate() + 28);
      const startStr = dateKeyFromDate(rangeStart);
      const endStr = dateKeyFromDate(rangeEnd);

      for (const rt of recurringTasks) {
        if (filterAssignee && rt.assignee !== filterAssignee) continue;
        if (filterChannelId !== null && rt.channelId !== filterChannelId) continue;

        const instances = generateInstances(rt, startStr, endStr, employeeColorMap);
        for (const inst of instances) {
          items.push({
            id: inst.id,
            name: inst.name,
            description: inst.description,
            assignee: inst.assignee,
            deadline: inst.deadline,
            dueTime: inst.dueTime,
            duration: inst.duration,
            status: inst.status,
            statusLabel: inst.statusLabel,
            statusColor: inst.statusColor,
            source: "recurring",
            projectName: undefined,
            channelName: rt.channelId ? channelNameMap.get(rt.channelId) : undefined,
            color: inst.color,
          });
        }
      }
    }

    return items;
  }, [
    projects,
    standaloneTasks,
    recurringTasks,
    weekStart,
    filterAssignee,
    filterProjectId,
    filterChannelId,
    channelNameMap,
    employeeColorMap,
  ]);

  // ─── Items indexed by date ───
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of calendarItems) {
      const existing = map.get(item.deadline) || [];
      existing.push(item);
      map.set(item.deadline, existing);
    }
    return map;
  }, [calendarItems]);

  // ─── Week data ───
  const weekDays = getWeekDays(weekStart);
  const weekLabel = (() => {
    const first = weekDays[0];
    const last = weekDays[6];
    const f = first.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    const l = last.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${f} — ${l}`;
  })();

  // ─── Day data ───
  const dayLabel = selectedDay.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const capitalizedDayLabel = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);

  // ─── Month data ───
  const monthLabel = `${MONTH_NAMES_RU[monthViewDate.getMonth()]} ${monthViewDate.getFullYear()}`;
  const monthGridDates = useMemo(
    () => getMonthGridDates(monthViewDate.getFullYear(), monthViewDate.getMonth()),
    [monthViewDate]
  );

  // ─── Project color map (stable per project id) ───
  const projectColorMap = useMemo(() => {
    const map = new Map<number, string>();
    projects.forEach((p, i) => {
      map.set(p.id, PROJECT_PALETTE[i % PROJECT_PALETTE.length]);
    });
    return map;
  }, [projects]);

  // ─── Month view: project items by date ───
  const monthProjectsByDate = useMemo(() => {
    const map = new Map<string, MonthProjectItem[]>();
    const addItem = (dateKey: string, item: MonthProjectItem) => {
      const arr = map.get(dateKey) || [];
      arr.push(item);
      map.set(dateKey, arr);
    };

    for (const project of projects) {
      if (filterProjectId !== null && project.id !== filterProjectId) continue;
      const color = projectColorMap.get(project.id) || PROJECT_PALETTE[0];

      // Project deadline
      if (project.deadline) {
        addItem(project.deadline, {
          type: "project",
          name: project.name,
          projectName: project.name,
          color,
          projectId: project.id,
        });
      }

      // Stage deadlines
      for (const stage of project.stages) {
        if (stage.deadline && stage.deadline !== project.deadline) {
          addItem(stage.deadline, {
            type: "stage",
            name: stage.name,
            projectName: project.name,
            color,
            projectId: project.id,
          });
        }
      }
    }

    return map;
  }, [projects, filterProjectId, projectColorMap]);

  // ─── Navigation ───
  const goToPrev = () => {
    if (view === "week") {
      setWeekStart((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      });
    } else if (view === "day") {
      setSelectedDay((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 1);
        return d;
      });
    } else {
      setMonthViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  };

  const goToNext = () => {
    if (view === "week") {
      setWeekStart((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      });
    } else if (view === "day") {
      setSelectedDay((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 1);
        return d;
      });
    } else {
      setMonthViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  };

  const goToToday = () => {
    const now = new Date();
    setWeekStart(getWeekStart(now));
    setSelectedDay(now);
    setMonthViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // ─── Separate timed vs all-day items for a given date key ───
  function getTimedItems(dateKey: string): CalendarItem[] {
    const items = itemsByDate.get(dateKey) || [];
    return items.filter((item) => !!item.dueTime);
  }

  function getAllDayItems(dateKey: string): CalendarItem[] {
    const items = itemsByDate.get(dateKey) || [];
    return items.filter((item) => !item.dueTime);
  }

  // ─── Visible dates for current view ───
  const visibleDates: Date[] =
    view === "week" ? weekDays : view === "day" ? [selectedDay] : monthGridDates;

  // ─────────────────────────────────────────────────────────────────────
  // ─── Drag-and-Drop helpers ─────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────

  /** Given a pointer position relative to the grid, compute target dateKey and minute */
  const computeDropTarget = useCallback(
    (clientX: number, clientY: number): { dateKey: string; minute: number } | null => {
      const grid = gridRef.current;
      if (!grid) return null;

      const rect = grid.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top + grid.scrollTop;

      // Determine which column
      const columnCount = visibleDates.length;
      const gridWidth = rect.width - GUTTER_WIDTH;
      const colWidth = gridWidth / columnCount;
      let colIndex = Math.floor((relX - GUTTER_WIDTH) / colWidth);
      colIndex = Math.max(0, Math.min(colIndex, columnCount - 1));

      const targetDate = visibleDates[colIndex];
      const dateKey = dateKeyFromDate(targetDate);

      // Determine which minute
      const minuteRaw = (relY / HOUR_HEIGHT) * 60 + START_HOUR * 60;
      const minute = roundTo15(Math.max(START_HOUR * 60, Math.min(minuteRaw, END_HOUR * 60 - 15)));

      return { dateKey, minute };
    },
    [visibleDates]
  );

  // ─────────────────────────────────────────────────────────────────────
  // ─── Drag & resize: refs + document-level pointer listeners ────────
  // ─────────────────────────────────────────────────────────────────────
  // Listeners are attached SYNCHRONOUSLY in start handlers (no useEffect
  // timing gap) and removed on pointer-up. A cleanup effect is a safety
  // net for unmount during active drag/resize.

  const dragStateRef = useRef<DragState | null>(null);
  const resizeStateRef = useRef<ResizeState | null>(null);
  const listenersAttachedRef = useRef(false);

  // Keep computeDropTarget ref stable for the listeners
  const computeDropTargetRef = useRef(computeDropTarget);
  computeDropTargetRef.current = computeDropTarget;
  const onUpdateProjectTaskRef = useRef(onUpdateProjectTask);
  onUpdateProjectTaskRef.current = onUpdateProjectTask;
  const onUpdateStandaloneTaskRef = useRef(onUpdateStandaloneTask);
  onUpdateStandaloneTaskRef.current = onUpdateStandaloneTask;

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const ds = dragStateRef.current;
    const rs = resizeStateRef.current;

    if (ds) {
      e.preventDefault();
      const target = computeDropTargetRef.current(e.clientX, e.clientY);
      if (!target) return;

      const adjustedMinute = roundTo15(
        target.minute - (ds.offsetY / HOUR_HEIGHT) * 60
      );
      const clampedMinute = Math.max(
        START_HOUR * 60,
        Math.min(adjustedMinute, END_HOUR * 60 - (ds.item.duration || 60))
      );

      const next: DragState = {
        ...ds,
        currentDateKey: target.dateKey,
        currentMinute: clampedMinute,
        hasMoved: true,
      };
      dragStateRef.current = next;
      setDragState(next);
    } else if (rs) {
      e.preventDefault();
      const grid = gridRef.current;
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      const relY = e.clientY - rect.top + grid.scrollTop;
      const pointerMinute = roundTo15((relY / HOUR_HEIGHT) * 60 + START_HOUR * 60);

      let next: ResizeState;
      if (rs.edge === "bottom") {
        const newEnd = Math.max(pointerMinute, rs.originalStartMinute + 15);
        const clampedEnd = Math.min(newEnd, END_HOUR * 60);
        const newDuration = clampedEnd - rs.originalStartMinute;
        next = { ...rs, currentDuration: Math.max(15, newDuration), hasMoved: true };
      } else {
        const originalEnd = rs.originalStartMinute + rs.originalDuration;
        const newStart = Math.min(pointerMinute, originalEnd - 15);
        const clampedStart = Math.max(newStart, START_HOUR * 60);
        const newDuration = originalEnd - clampedStart;
        next = { ...rs, currentStartMinute: clampedStart, currentDuration: Math.max(15, newDuration), hasMoved: true };
      }
      resizeStateRef.current = next;
      setResizeState(next);
    }
  }, []);

  const removeDocumentListeners = useCallback(() => {
    if (listenersAttachedRef.current) {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUpDoc);
      listenersAttachedRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePointerUpDoc = useCallback((e: PointerEvent) => {
    const ds = dragStateRef.current;
    const rs = resizeStateRef.current;

    removeDocumentListeners();

    if (ds) {
      e.preventDefault();
      if (!ds.hasMoved) {
        setSelectedItem(ds.item);
        dragStateRef.current = null;
        setDragState(null);
        return;
      }

      const newDeadline = ds.currentDateKey;
      const newDueTime = minutesToTimeString(ds.currentMinute);
      // Default to 60 min when dropping an all-day task onto the timed grid
      const duration = ds.item.duration || 60;
      const item = ds.item;

      if (item.source === "project" && onUpdateProjectTaskRef.current && item._projectId != null && item._stageId != null && item._taskId != null) {
        onUpdateProjectTaskRef.current(item._projectId, item._stageId, item._taskId, {
          deadline: newDeadline,
          dueTime: newDueTime,
          duration: duration,
        });
      } else if (item.source === "standalone" && onUpdateStandaloneTaskRef.current && item._taskId != null) {
        onUpdateStandaloneTaskRef.current(item._taskId, {
          deadline: newDeadline,
          dueTime: newDueTime,
          duration: duration,
        });
      }

      dragStateRef.current = null;
      setDragState(null);
    } else if (rs) {
      e.preventDefault();
      if (!rs.hasMoved) {
        resizeStateRef.current = null;
        setResizeState(null);
        return;
      }

      const item = rs.item;
      const newDueTime = minutesToTimeString(rs.currentStartMinute);
      const newDuration = rs.currentDuration;

      if (item.source === "project" && onUpdateProjectTaskRef.current && item._projectId != null && item._stageId != null && item._taskId != null) {
        onUpdateProjectTaskRef.current(item._projectId, item._stageId, item._taskId, {
          deadline: rs.dateKey,
          dueTime: newDueTime,
          duration: newDuration,
        });
      } else if (item.source === "standalone" && onUpdateStandaloneTaskRef.current && item._taskId != null) {
        onUpdateStandaloneTaskRef.current(item._taskId, {
          deadline: rs.dateKey,
          dueTime: newDueTime,
          duration: newDuration,
        });
      }

      resizeStateRef.current = null;
      setResizeState(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attachDocumentListeners = useCallback(() => {
    if (!listenersAttachedRef.current) {
      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUpDoc);
      listenersAttachedRef.current = true;
    }
  }, [handlePointerMove, handlePointerUpDoc]);

  // Safety-net cleanup on unmount
  useEffect(() => {
    return () => removeDocumentListeners();
  }, [removeDocumentListeners]);

  /** Start drag on a timed task block */
  const handleDragStart = useCallback(
    (e: React.PointerEvent, item: CalendarItem, dateKey: string) => {
      if (e.button !== 0) return;
      e.preventDefault();

      const blockElement = e.currentTarget as HTMLElement;
      const blockRect = blockElement.getBoundingClientRect();
      const offsetY = e.clientY - blockRect.top;

      let currentMinute = START_HOUR * 60;
      if (item.dueTime) {
        const [h, m] = item.dueTime.split(":").map(Number);
        currentMinute = h * 60 + m;
      }

      const ds: DragState = {
        item,
        offsetY,
        currentDateKey: dateKey,
        currentMinute,
        hasMoved: false,
      };
      dragStateRef.current = ds;
      setDragState(ds);
      attachDocumentListeners();
    },
    [attachDocumentListeners]
  );

  /** Start drag on an all-day task block */
  const handleAllDayDragStart = useCallback(
    (e: React.PointerEvent, item: CalendarItem, dateKey: string) => {
      if (e.button !== 0) return;
      e.preventDefault();

      const ds: DragState = {
        item,
        offsetY: 0,
        currentDateKey: dateKey,
        currentMinute: START_HOUR * 60,
        hasMoved: false,
      };
      dragStateRef.current = ds;
      setDragState(ds);
      attachDocumentListeners();
    },
    [attachDocumentListeners]
  );

  /** Start resize on a timed task block edge */
  const handleResizeStart = useCallback(
    (e: React.PointerEvent, item: CalendarItem, dateKey: string, edge: "top" | "bottom") => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      let startMinute = START_HOUR * 60;
      if (item.dueTime) {
        const [h, m] = item.dueTime.split(":").map(Number);
        startMinute = h * 60 + m;
      }
      const dur = item.duration || 60;

      const rs: ResizeState = {
        item,
        dateKey,
        edge,
        originalStartMinute: startMinute,
        originalDuration: dur,
        currentStartMinute: startMinute,
        currentDuration: dur,
        hasMoved: false,
      };
      resizeStateRef.current = rs;
      setResizeState(rs);
      attachDocumentListeners();
    },
    [attachDocumentListeners]
  );

  // Add body class while dragging/resizing to change cursor globally
  useEffect(() => {
    if ((dragState && dragState.hasMoved) || (resizeState && resizeState.hasMoved)) {
      document.body.style.cursor = resizeState ? "ns-resize" : "grabbing";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragState, resizeState]);

  // ─── Toggle task status (done ↔ todo) ───
  function handleToggleStatus(item: CalendarItem) {
    if (item.source === "recurring") return; // recurring tasks have no toggle
    const newStatus = item.status === "done" ? "todo" : "done";
    if (item.source === "project" && onToggleProjectTaskStatus && item._projectId != null && item._stageId != null && item._taskId != null) {
      onToggleProjectTaskStatus(item._projectId, item._stageId, item._taskId, newStatus as import("@/types/dashboard").ProjectTaskStatus);
    } else if (item.source === "standalone" && onToggleStandaloneTaskStatus && item._taskId != null) {
      onToggleStandaloneTaskStatus(item._taskId, newStatus as import("@/types/dashboard").StandaloneTaskStatus);
    }
  }

  // ─── Click on empty grid cell → open quick-add ───
  function handleCellClick(dateKey: string, hour?: number) {
    if (dragState || resizeState) return;
    if (!onCreateStandaloneTask) return;
    setQuickAddState({
      date: dateKey,
      time: hour != null ? `${String(hour).padStart(2, "0")}:00` : undefined,
    });
  }

  // ─── Render: Task detail popup ───
  const taskDetailPopup = selectedItem && (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
      <div
        ref={popupRef}
        className="bg-white rounded-xl p-5 shadow-xl max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedItem.color }}
            />
            <span className="text-sm font-medium text-gray-700">
              {selectedItem.source === "project" ? "Проектная задача" : selectedItem.source === "recurring" ? "Регулярная задача" : "Отдельная задача"}
            </span>
          </div>
          <button
            onClick={() => setSelectedItem(null)}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            {"\u00D7"}
          </button>
        </div>

        <p className="mt-3 text-gray-900 font-medium">{selectedItem.name}</p>

        {selectedItem.description && (
          <p className="mt-1 text-sm text-gray-500">{selectedItem.description}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${selectedItem.statusColor}`}>
            {selectedItem.statusLabel}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
            {selectedItem.source === "project" ? "Проект" : selectedItem.source === "recurring" ? "Регулярная" : "Задача"}
          </span>
        </div>

        <div className="mt-3 space-y-1 text-xs text-gray-500">
          <p>Ответственный: {selectedItem.assignee}</p>
          <p>
            Срок:{" "}
            {new Date(selectedItem.deadline + "T00:00:00").toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {selectedItem.dueTime && `, ${selectedItem.dueTime}`}
          </p>
          {selectedItem.duration && (
            <p>Длительность: {formatDuration(selectedItem.duration)}</p>
          )}
          {selectedItem.projectName && <p>Проект: {selectedItem.projectName}</p>}
          {selectedItem.channelName && <p>Канал: {selectedItem.channelName}</p>}
        </div>

        {/* Toggle status button (not for recurring) */}
        {selectedItem.source !== "recurring" && (onToggleProjectTaskStatus || onToggleStandaloneTaskStatus) && (
          <button
            onClick={() => {
              handleToggleStatus(selectedItem);
              setSelectedItem(null);
            }}
            className={`mt-4 w-full py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedItem.status === "done"
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
            }`}
          >
            {selectedItem.status === "done" ? "Вернуть в работу" : "✓ Отметить выполненной"}
          </button>
        )}
      </div>
    </div>
  );

  // ─── Render: All-day items section ───
  function renderAllDaySection(dateKey: string, _columnWidth?: string) {
    const items = getAllDayItems(dateKey);
    if (items.length === 0) return null;
    return (
      <div className="space-y-0.5">
        {items.map((item) => {
          const isDraggingThis = dragState?.item.id === item.id;
          const isDone = item.status === "done";
          return (
            <div
              key={item.id}
              className={`w-full text-left flex items-center gap-1 px-1.5 py-1 rounded text-xs hover:bg-gray-100 transition-colors touch-none select-none ${
                isDraggingThis && dragState?.hasMoved ? "opacity-40" : ""
              } ${isDone ? "opacity-60" : ""}`}
              style={{
                borderLeft: `3px solid ${isDone ? "#22c55e" : item.color}`,
                cursor: dragState ? "grabbing" : "grab",
              }}
              onPointerDown={(e) => handleAllDayDragStart(e, item, dateKey)}
            >
              {/* Status checkbox (not for recurring) */}
              {item.source !== "recurring" && (onToggleProjectTaskStatus || onToggleStandaloneTaskStatus) ? (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStatus(item);
                  }}
                  className={`w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
                    isDone
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-400 hover:border-indigo-400 hover:bg-indigo-50"
                  }`}
                  title={isDone ? "Отменить выполнение" : "Отметить выполненной"}
                >
                  {isDone && (
                    <svg className="w-1.5 h-1.5" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ) : (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.source === "project" ? PROJECT_TASK_COLOR : item.source === "recurring" ? RECURRING_TASK_COLOR : STANDALONE_TASK_COLOR }}
                />
              )}
              <span className={`truncate ${isDone ? "line-through text-gray-400" : "text-gray-700"}`}>{item.name}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // ─── Render: Current time indicator ───
  function renderCurrentTimeIndicator(
    dayDates: Date[],
    gridColumnOffset: number
  ) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = START_HOUR * 60;
    const endMinutes = END_HOUR * 60;
    if (nowMinutes < startMinutes || nowMinutes > endMinutes) return null;

    const todayDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayIdx = dayDates.findIndex(
      (wd) =>
        wd.getFullYear() === todayDateObj.getFullYear() &&
        wd.getMonth() === todayDateObj.getMonth() &&
        wd.getDate() === todayDateObj.getDate()
    );
    if (dayIdx === -1) return null;

    const topPx = ((nowMinutes - startMinutes) / 60) * HOUR_HEIGHT;

    return (
      <div
        className="absolute pointer-events-none z-20"
        style={{
          gridColumn: `${dayIdx + gridColumnOffset} / span 1`,
          gridRow: "1 / -1",
          top: topPx,
          left: 0,
          right: 0,
        }}
      >
        <div className="relative">
          <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
          <div className="h-0.5 bg-red-500 w-full" />
        </div>
      </div>
    );
  }

  // ─── Render: Drag preview / ghost block ───
  function renderDragPreview(gridColumnOffset: number) {
    if (!dragState || !dragState.hasMoved) return null;

    const item = dragState.item;
    const duration = item.duration || 60;
    const startMinutes = START_HOUR * 60;
    const topPx = ((dragState.currentMinute - startMinutes) / 60) * HOUR_HEIGHT;
    const heightPx = (duration / 60) * HOUR_HEIGHT;

    // Find which column matches the currentDateKey
    const colIndex = visibleDates.findIndex(
      (d) => dateKeyFromDate(d) === dragState.currentDateKey
    );
    if (colIndex === -1) return null;

    const gridColumn = colIndex + gridColumnOffset;

    const clampedHeight = Math.min(
      heightPx,
      ((END_HOUR * 60 - dragState.currentMinute) / 60) * HOUR_HEIGHT
    );

    return (
      <div
        className="absolute mx-0.5 rounded-lg px-2 py-1 text-left overflow-hidden pointer-events-none z-30 border-2 border-dashed"
        style={{
          gridColumn: `${gridColumn} / span 1`,
          gridRow: "1 / -1",
          top: Math.max(topPx, 0),
          height: clampedHeight,
          left: 2,
          right: 2,
          backgroundColor: item.color + "30",
          borderColor: item.color,
        }}
      >
        <div className="flex items-center gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              backgroundColor:
                item.source === "project" ? PROJECT_TASK_COLOR : item.source === "recurring" ? RECURRING_TASK_COLOR : STANDALONE_TASK_COLOR,
            }}
          />
          <span
            className="text-xs font-medium truncate"
            style={{ color: item.color }}
          >
            {minutesToTimeString(dragState.currentMinute)}
          </span>
        </div>
        <p className="text-xs text-gray-800 mt-0.5 leading-tight line-clamp-2">
          {item.name}
        </p>
        {clampedHeight > 50 && (
          <span className="text-[10px] text-gray-500 mt-0.5 block">
            {item.assignee} · {formatDurationShort(duration)}
          </span>
        )}
      </div>
    );
  }

  // ─── Render: Timed task blocks for a given column (with overlap layout) ───
  function renderTimedBlocks(
    dateKey: string,
    gridColumn: number
  ) {
    const items = getTimedItems(dateKey);

    // Build layout items for overlap calculation
    const layoutItems: LayoutItem[] = [];
    for (const item of items) {
      const [h, m] = item.dueTime!.split(":").map(Number);
      const startMin = h * 60 + m;
      const dur = item.duration || 60;
      if (startMin + dur < START_HOUR * 60 || startMin >= END_HOUR * 60) continue;
      layoutItems.push({ id: item.id, startMin, endMin: startMin + dur });
    }
    const layoutMap = layoutOverlappingItems(layoutItems);

    return items.map((item) => {
      const [h, m] = item.dueTime!.split(":").map(Number);
      let taskStartMin = h * 60 + m;
      let duration = item.duration || 60;

      // If this item is being resized, use the live resize values
      const isResizingThis = resizeState?.item.id === item.id;
      if (isResizingThis && resizeState) {
        taskStartMin = resizeState.currentStartMinute;
        duration = resizeState.currentDuration;
      }

      const startMinutes = START_HOUR * 60;
      const topPx = ((taskStartMin - startMinutes) / 60) * HOUR_HEIGHT;
      const heightPx = (duration / 60) * HOUR_HEIGHT;

      // Skip if outside visible range
      if (taskStartMin + duration < startMinutes || taskStartMin >= END_HOUR * 60) {
        return null;
      }

      const clampedHeight = Math.min(
        heightPx,
        ((END_HOUR * 60 - taskStartMin) / 60) * HOUR_HEIGHT
      );

      const isDraggingThis = dragState?.item.id === item.id;
      const isInteracting = isDraggingThis || isResizingThis;
      const HANDLE_HEIGHT = 6; // px — resize handle thickness

      // Overlap layout: compute left/width percentages
      const layout = layoutMap.get(item.id);
      const colCount = layout?.totalColumns ?? 1;
      const colIndex = layout?.column ?? 0;
      const widthPct = `${(1 / colCount) * 100}%`;
      const leftPct = `${(colIndex / colCount) * 100}%`;

      return (
        <div
          key={item.id}
          onPointerDown={(e) => handleDragStart(e, item, dateKey)}
          className={`absolute rounded-lg text-left overflow-hidden hover:brightness-95 transition-all border border-white/50 touch-none select-none group/block ${
            isDraggingThis && dragState?.hasMoved ? "opacity-40" : ""
          } ${isResizingThis && resizeState?.hasMoved ? "ring-2 ring-indigo-400/50" : ""}`}
          style={{
            gridColumn: `${gridColumn} / span 1`,
            gridRow: "1 / -1",
            top: Math.max(topPx, 0),
            height: clampedHeight,
            left: leftPct,
            width: widthPct,
            backgroundColor: item.status === "done" ? "#d1fae520" : item.color + "20",
            borderLeft: `3px solid ${item.status === "done" ? "#22c55e" : item.color}`,
            cursor: resizeState ? "ns-resize" : dragState ? "grabbing" : "grab",
            zIndex: isInteracting ? 25 : undefined,
          }}
        >
          {/* Top resize handle */}
          <div
            onPointerDown={(e) => handleResizeStart(e, item, dateKey, "top")}
            className="absolute top-0 left-0 right-0 opacity-0 group-hover/block:opacity-100 transition-opacity z-10"
            style={{ height: HANDLE_HEIGHT, cursor: "ns-resize" }}
          >
            <div className="mx-auto mt-0.5 w-8 h-1 rounded-full bg-gray-400/60" />
          </div>

          {/* Content area */}
          <div className={`px-2 py-1 ${item.status === "done" ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-1">
              {/* Status checkbox (not for recurring) */}
              {item.source !== "recurring" && (onToggleProjectTaskStatus || onToggleStandaloneTaskStatus) && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStatus(item);
                  }}
                  className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
                    item.status === "done"
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-400 hover:border-indigo-400 hover:bg-indigo-50"
                  }`}
                  title={item.status === "done" ? "Отменить выполнение" : "Отметить выполненной"}
                >
                  {item.status === "done" && (
                    <svg className="w-2 h-2" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              )}
              {item.source === "recurring" && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: RECURRING_TASK_COLOR }}
                />
              )}
              <span
                className="text-xs font-medium truncate"
                style={{ color: item.color }}
              >
                {isResizingThis && resizeState?.hasMoved
                  ? minutesToTimeString(resizeState!.currentStartMinute)
                  : item.dueTime}
              </span>
            </div>
            <p className={`text-xs text-gray-800 mt-0.5 leading-tight line-clamp-2 ${item.status === "done" ? "line-through text-gray-400" : ""}`}>
              {item.name}
            </p>
            {clampedHeight > 50 && (
              <span className="text-[10px] text-gray-500 mt-0.5 block">
                {item.assignee} · {formatDurationShort(duration)}
              </span>
            )}
          </div>

          {/* Bottom resize handle */}
          <div
            onPointerDown={(e) => handleResizeStart(e, item, dateKey, "bottom")}
            className="absolute bottom-0 left-0 right-0 opacity-0 group-hover/block:opacity-100 transition-opacity z-10"
            style={{ height: HANDLE_HEIGHT, cursor: "ns-resize" }}
          >
            <div className="mx-auto mb-0.5 w-8 h-1 rounded-full bg-gray-400/60" />
          </div>
        </div>
      );
    });
  }

  return (
    <div className="space-y-4">
      {/* ═══ Filters Row ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Assignee filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-sm text-gray-500 font-medium whitespace-nowrap">Исполнитель:</label>
          <select
            value={filterAssignee ?? "__all__"}
            onChange={(e) =>
              setFilterAssignee(e.target.value === "__all__" ? null : e.target.value)
            }
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
          >
            <option value="__all__">Все сотрудники</option>
            {allAssignees.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Project filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-sm text-gray-500 font-medium">Проект:</label>
          <select
            value={filterProjectId ?? "__all__"}
            onChange={(e) =>
              setFilterProjectId(e.target.value === "__all__" ? null : Number(e.target.value))
            }
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
          >
            <option value="__all__">Все проекты</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Channel filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-sm text-gray-500 font-medium">Канал:</label>
          <select
            value={filterChannelId ?? "__all__"}
            onChange={(e) =>
              setFilterChannelId(e.target.value === "__all__" ? null : Number(e.target.value))
            }
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
          >
            <option value="__all__">Все каналы</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ═══ Calendar Card ═══ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header: navigation + view toggle */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrev}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-600 text-lg"
            >
              {"\u2039"}
            </button>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 min-w-[180px] sm:min-w-[280px] text-center">
              {view === "week" ? weekLabel : view === "day" ? capitalizedDayLabel : monthLabel}
            </h2>
            <button
              onClick={goToNext}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-600 text-lg"
            >
              {"\u203A"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Сегодня
            </button>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setView("month")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  view === "month"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Месяц
              </button>
              <button
                onClick={() => setView("week")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  view === "week"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Неделя
              </button>
              <button
                onClick={() => setView("day")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  view === "day"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                День
              </button>
              <button
                onClick={() => setView("gantt")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  view === "gantt"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Гант
              </button>
            </div>
          </div>
        </div>

        {/* ═══ GANTT VIEW ═══ */}
        {view === "gantt" && (
          <GanttChart
            projects={projects}
            plans={plans}
            standaloneTasks={standaloneTasks}
            onToggleProjectTaskStatus={onToggleProjectTaskStatus}
            onToggleStandaloneTaskStatus={onToggleStandaloneTaskStatus}
          />
        )}

        {/* ═══ MONTH VIEW ═══ */}
        {view === "month" && (
          <div className="overflow-auto">
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAY_NAMES_SHORT_RU.map((name, i) => (
                <div
                  key={i}
                  className={`px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide ${
                    i >= 5 ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  <span className="hidden sm:inline">{DAY_NAMES_FULL_RU[i]}</span>
                  <span className="sm:hidden">{name}</span>
                </div>
              ))}
            </div>

            {/* Calendar grid: 6 rows × 7 cols */}
            <div className="grid grid-cols-7">
              {monthGridDates.map((date, idx) => {
                const key = dateKeyFromDate(date);
                const isToday = key === todayKey;
                const isCurrentMonth = date.getMonth() === monthViewDate.getMonth();
                const isWeekend = idx % 7 >= 5;
                const projectItems = monthProjectsByDate.get(key) || [];

                return (
                  <div
                    key={idx}
                    className={`border-r border-b border-gray-100 min-h-[100px] sm:min-h-[120px] p-1 sm:p-1.5 transition-colors ${
                      !isCurrentMonth ? "bg-gray-50/60" : ""
                    } ${isToday ? "bg-indigo-50/40" : ""} ${isWeekend && isCurrentMonth ? "bg-gray-50/30" : ""}`}
                  >
                    {/* Day number + add button */}
                    <div className="flex items-center justify-between mb-1 group/daycell">
                      <span
                        className={`text-sm font-semibold leading-none ${
                          isToday
                            ? "bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center"
                            : !isCurrentMonth
                            ? "text-gray-300"
                            : isWeekend
                            ? "text-gray-400"
                            : "text-gray-700"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      {onCreateStandaloneTask && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCellClick(key);
                          }}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:bg-indigo-100 hover:text-indigo-600 opacity-0 group-hover/daycell:opacity-100 transition-all text-sm leading-none"
                          title="Добавить задачу"
                        >
                          +
                        </button>
                      )}
                    </div>

                    {/* Project items */}
                    <div className="space-y-0.5">
                      {projectItems.slice(0, 4).map((item, i) => (
                        <div
                          key={`${item.projectId}-${item.type}-${i}`}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] leading-tight truncate cursor-default hover:brightness-95 transition-colors"
                          style={{
                            backgroundColor: item.color + "18",
                            borderLeft: `2px solid ${item.color}`,
                          }}
                          title={
                            item.type === "project"
                              ? `Проект: ${item.name}`
                              : `Этап: ${item.name} (${item.projectName})`
                          }
                        >
                          {item.type === "project" ? (
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          ) : (
                            <span className="w-1 h-1 rounded-full flex-shrink-0 border" style={{ borderColor: item.color }} />
                          )}
                          <span
                            className={`truncate ${
                              item.type === "project" ? "font-medium" : "font-normal"
                            }`}
                            style={{ color: item.color }}
                          >
                            {item.type === "project" ? item.name : item.name}
                          </span>
                        </div>
                      ))}
                      {projectItems.length > 4 && (
                        <div className="text-[10px] text-gray-400 px-1.5">
                          +{projectItems.length - 4} ещё
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Month legend */}
            <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center gap-3">
              {projects
                .filter((p) => filterProjectId === null || p.id === filterProjectId)
                .map((p) => {
                  const color = projectColorMap.get(p.id) || PROJECT_PALETTE[0];
                  return (
                    <div key={p.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span>{p.name}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ═══ WEEK VIEW ═══ */}
        {view === "week" && (
          <div className="overflow-auto">
            <div className="min-w-[600px]">
            {/* Day headers */}
            <div
              className="grid border-b border-gray-100 sticky top-0 bg-white z-10"
              style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}
            >
              {/* Time gutter header */}
              <div className="border-r border-gray-100 px-1 py-3" />
              {weekDays.map((date, i) => {
                const key = formatDateKey(
                  date.getFullYear(),
                  date.getMonth(),
                  date.getDate()
                );
                const isToday = key === todayKey;
                const isWeekend = i >= 5;
                return (
                  <div
                    key={i}
                    className={`px-1 sm:px-2 py-2 sm:py-3 text-center border-r border-gray-100 ${
                      isToday ? "bg-indigo-50/50" : ""
                    }`}
                  >
                    <div
                      className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${
                        isToday
                          ? "text-indigo-600"
                          : isWeekend
                          ? "text-gray-400"
                          : "text-gray-500"
                      }`}
                    >
                      <span className="hidden sm:inline">{DAY_NAMES_FULL_RU[i]}</span>
                      <span className="sm:hidden">{DAY_NAMES_SHORT_RU[i]}</span>
                    </div>
                    <div
                      className={`text-base sm:text-lg font-bold mt-0.5 ${
                        isToday ? "text-indigo-600" : "text-gray-900"
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* All-day section */}
            {(() => {
              const hasAnyAllDay = weekDays.some((date) => {
                const key = formatDateKey(
                  date.getFullYear(),
                  date.getMonth(),
                  date.getDate()
                );
                return getAllDayItems(key).length > 0;
              });
              if (!hasAnyAllDay) return null;
              return (
                <div
                  ref={allDayGridRef}
                  className="grid border-b border-gray-200 bg-gray-50/50"
                  style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}
                >
                  <div className="border-r border-gray-100 px-1 py-2 flex items-start justify-end pr-2">
                    <span className="text-[10px] text-gray-400 font-medium uppercase">
                      Весь день
                    </span>
                  </div>
                  {weekDays.map((date, i) => {
                    const key = formatDateKey(
                      date.getFullYear(),
                      date.getMonth(),
                      date.getDate()
                    );
                    const isToday = key === todayKey;
                    return (
                      <div
                        key={i}
                        className={`border-r border-gray-100 px-1 py-1.5 min-h-[40px] ${
                          isToday ? "bg-indigo-50/20" : ""
                        }`}
                      >
                        {renderAllDaySection(key)}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Hourly grid */}
            <div
              ref={gridRef}
              className="grid relative"
              style={{
                gridTemplateColumns: "60px repeat(7, 1fr)",
                gridTemplateRows: `repeat(${HOURS.length}, ${HOUR_HEIGHT}px)`,
              }}
            >
              {/* Hour labels */}
              {HOURS.map((hour, rowIdx) => (
                <div
                  key={`label-${hour}`}
                  className="border-r border-b border-gray-100 px-1 flex items-start justify-end pr-2 pt-0.5"
                  style={{ gridRow: rowIdx + 1, gridColumn: 1 }}
                >
                  <span className="text-xs text-gray-400 font-medium">
                    {String(hour).padStart(2, "0")}:00
                  </span>
                </div>
              ))}

              {/* Day column cells (background grid) — click to add task */}
              {weekDays.map((date, colIdx) => {
                const key = formatDateKey(
                  date.getFullYear(),
                  date.getMonth(),
                  date.getDate()
                );
                const isToday = key === todayKey;
                return HOURS.map((hour, rowIdx) => (
                  <div
                    key={`cell-${colIdx}-${rowIdx}`}
                    className={`border-r border-b border-gray-100 cursor-pointer hover:bg-indigo-50/40 transition-colors ${
                      isToday ? "bg-indigo-50/20" : ""
                    }`}
                    style={{ gridRow: rowIdx + 1, gridColumn: colIdx + 2 }}
                    onClick={() => handleCellClick(key, hour)}
                  />
                ));
              })}

              {/* Current time indicator */}
              {renderCurrentTimeIndicator(weekDays, 2)}

              {/* Timed task blocks */}
              {weekDays.map((date, colIdx) => {
                const key = formatDateKey(
                  date.getFullYear(),
                  date.getMonth(),
                  date.getDate()
                );
                return renderTimedBlocks(key, colIdx + 2);
              })}

              {/* Drag preview ghost */}
              {renderDragPreview(2)}
            </div>
            </div>
          </div>
        )}

        {/* ═══ DAY VIEW ═══ */}
        {view === "day" && (
          <div className="overflow-auto">
            {/* Day header */}
            <div
              className="grid border-b border-gray-100 sticky top-0 bg-white z-10"
              style={{ gridTemplateColumns: "60px 1fr" }}
            >
              <div className="border-r border-gray-100 px-1 py-3" />
              {(() => {
                const key = formatDateKey(
                  selectedDay.getFullYear(),
                  selectedDay.getMonth(),
                  selectedDay.getDate()
                );
                const isToday = key === todayKey;
                const dayOfWeekIndex = (() => {
                  const dow = selectedDay.getDay();
                  return dow === 0 ? 6 : dow - 1; // Convert to Mon=0 ... Sun=6
                })();
                return (
                  <div
                    className={`px-4 py-3 text-center ${
                      isToday ? "bg-indigo-50/50" : ""
                    }`}
                  >
                    <div
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        isToday ? "text-indigo-600" : "text-gray-500"
                      }`}
                    >
                      {DAY_NAMES_FULL_RU[dayOfWeekIndex]}
                    </div>
                    <div
                      className={`text-lg font-bold mt-0.5 ${
                        isToday ? "text-indigo-600" : "text-gray-900"
                      }`}
                    >
                      {selectedDay.getDate()}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* All-day section for selected day */}
            {(() => {
              const dayKey = formatDateKey(
                selectedDay.getFullYear(),
                selectedDay.getMonth(),
                selectedDay.getDate()
              );
              const allDayItems = getAllDayItems(dayKey);
              if (allDayItems.length === 0) return null;
              return (
                <div
                  ref={allDayGridRef}
                  className="grid border-b border-gray-200 bg-gray-50/50"
                  style={{ gridTemplateColumns: "60px 1fr" }}
                >
                  <div className="border-r border-gray-100 px-1 py-2 flex items-start justify-end pr-2">
                    <span className="text-[10px] text-gray-400 font-medium uppercase">
                      Весь день
                    </span>
                  </div>
                  <div
                    className={`px-2 py-1.5 min-h-[40px] ${
                      dayKey === todayKey ? "bg-indigo-50/20" : ""
                    }`}
                  >
                    {renderAllDaySection(dayKey)}
                  </div>
                </div>
              );
            })()}

            {/* Hourly grid (single column) */}
            <div
              ref={gridRef}
              className="grid relative"
              style={{
                gridTemplateColumns: "60px 1fr",
                gridTemplateRows: `repeat(${HOURS.length}, ${HOUR_HEIGHT}px)`,
              }}
            >
              {/* Hour labels */}
              {HOURS.map((hour, rowIdx) => (
                <div
                  key={`label-${hour}`}
                  className="border-r border-b border-gray-100 px-1 flex items-start justify-end pr-2 pt-0.5"
                  style={{ gridRow: rowIdx + 1, gridColumn: 1 }}
                >
                  <span className="text-xs text-gray-400 font-medium">
                    {String(hour).padStart(2, "0")}:00
                  </span>
                </div>
              ))}

              {/* Background cells — click to add task */}
              {HOURS.map((hour, rowIdx) => {
                const dayKey = formatDateKey(
                  selectedDay.getFullYear(),
                  selectedDay.getMonth(),
                  selectedDay.getDate()
                );
                const isToday = dayKey === todayKey;
                return (
                  <div
                    key={`cell-${rowIdx}`}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-indigo-50/40 transition-colors ${
                      isToday ? "bg-indigo-50/20" : ""
                    }`}
                    style={{ gridRow: rowIdx + 1, gridColumn: 2 }}
                    onClick={() => handleCellClick(dayKey, hour)}
                  />
                );
              })}

              {/* Current time indicator */}
              {renderCurrentTimeIndicator([selectedDay], 2)}

              {/* Timed task blocks */}
              {(() => {
                const dayKey = formatDateKey(
                  selectedDay.getFullYear(),
                  selectedDay.getMonth(),
                  selectedDay.getDate()
                );
                return renderTimedBlocks(dayKey, 2);
              })()}

              {/* Drag preview ghost */}
              {renderDragPreview(2)}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 px-1">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: PROJECT_TASK_COLOR }}
          />
          <span>Проектные задачи</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: STANDALONE_TASK_COLOR }}
          />
          <span>Отдельные задачи</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: RECURRING_TASK_COLOR }}
          />
          <span>Регулярные задачи</span>
        </div>
      </div>

      {/* Task detail popup */}
      {taskDetailPopup}

      {/* Quick-add modal */}
      {quickAddState && onCreateStandaloneTask && (
        <CalendarQuickAddModal
          defaultDate={quickAddState.date}
          defaultTime={quickAddState.time}
          channels={channels}
          currentUser={currentUser}
          onSave={onCreateStandaloneTask}
          onClose={() => setQuickAddState(null)}
        />
      )}
    </div>
  );
}
