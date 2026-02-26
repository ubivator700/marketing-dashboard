"use client";

import { useState, useMemo } from "react";
import type { Department, DepartmentId, Task, TaskWithDepartment } from "@/types/dashboard";
import {
  dayNamesShortRu,
  statusLabels,
  statusColors,
  priorityLabels,
  priorityDots,
} from "@/lib/data";
import DepartmentFilter from "./department-filter";
import TaskEditModal from "./task-edit-modal";
import { layoutOverlappingItems, type LayoutItem } from "@/lib/calendar-layout";

// ─── Types ───────────────────────────────────────────────────────────
type CalendarView = "month" | "week";

interface CalendarTabProps {
  departments: Department[];
  selectedDept: DepartmentId | null;
  onDeptSelect: (deptId: DepartmentId | null) => void;
  onTaskSave: (deptId: DepartmentId, task: Task) => void;
  onTaskDelete: (deptId: DepartmentId, taskId: number) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/** Get Monday of the week containing `date`. */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Return array of 7 Date objects Mon–Sun for the week of `weekStart`. */
function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

const HOUR_HEIGHT = 60; // px per hour row
const START_HOUR = 8;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

const DAY_NAMES_FULL_RU = [
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
  "Воскресенье",
];

// ─── Component ───────────────────────────────────────────────────────
export default function CalendarTab({
  departments,
  selectedDept,
  onDeptSelect,
  onTaskSave,
  onTaskDelete,
}: CalendarTabProps) {
  const [view, setView] = useState<CalendarView>("month");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [selectedTask, setSelectedTask] = useState<TaskWithDepartment | null>(null);
  const [editingTask, setEditingTask] = useState<{ task: Task; deptId: DepartmentId; deptName: string; deptIcon: string } | null>(null);

  const today = new Date();
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  // ─── Tasks indexed by date ───
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskWithDepartment[]>();
    const filteredDepts = departments.filter((d) => !selectedDept || d.id === selectedDept);
    for (const dept of filteredDepts) {
      for (const task of dept.tasks) {
        const existing = map.get(task.dueDate) || [];
        existing.push({ ...task, dept });
        map.set(task.dueDate, existing);
      }
    }
    return map;
  }, [departments, selectedDept]);

  // ─── Month data ───
  const calendarDays = getCalendarDays(currentMonth.year, currentMonth.month);
  const monthLabel = new Date(currentMonth.year, currentMonth.month).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
  const capitalizedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  // ─── Week data ───
  const weekDays = getWeekDays(weekStart);
  const weekLabel = (() => {
    const first = weekDays[0];
    const last = weekDays[6];
    const f = first.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
    const l = last.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
    return `${f} — ${l}`;
  })();

  // ─── Navigation ───
  const goToPrev = () => {
    if (view === "month") {
      setCurrentMonth((prev) => {
        if (prev.month === 0) return { year: prev.year - 1, month: 11 };
        return { ...prev, month: prev.month - 1 };
      });
    } else {
      setWeekStart((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      });
    }
  };

  const goToNext = () => {
    if (view === "month") {
      setCurrentMonth((prev) => {
        if (prev.month === 11) return { year: prev.year + 1, month: 0 };
        return { ...prev, month: prev.month + 1 };
      });
    } else {
      setWeekStart((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      });
    }
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentMonth({ year: now.getFullYear(), month: now.getMonth() });
    setWeekStart(getWeekStart(now));
  };

  const handleOpenEdit = (task: TaskWithDepartment) => {
    setSelectedTask(null);
    setEditingTask({
      task,
      deptId: task.dept.id,
      deptName: task.dept.name,
      deptIcon: task.dept.icon,
    });
  };

  const handleEditSave = (deptId: DepartmentId, task: Task) => {
    onTaskSave(deptId, task);
    setEditingTask(null);
  };

  const handleEditDelete = (deptId: DepartmentId, taskId: number) => {
    onTaskDelete(deptId, taskId);
    setEditingTask(null);
  };

  const handleDetailDelete = (task: TaskWithDepartment) => {
    if (window.confirm("Удалить задачу?")) {
      onTaskDelete(task.dept.id, task.id);
      setSelectedTask(null);
    }
  };

  // ─── Render: Task Detail Modal ───
  const taskModal = selectedTask && (
    <div
      className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center"
      onClick={() => setSelectedTask(null)}
    >
      <div
        className="bg-white rounded-xl p-5 shadow-xl max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{selectedTask.dept.icon}</span>
            <span className="text-sm font-medium" style={{ color: selectedTask.dept.color }}>
              {selectedTask.dept.name}
            </span>
          </div>
          <button
            onClick={() => setSelectedTask(null)}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            {"\u00D7"}
          </button>
        </div>
        <p className="mt-3 text-gray-900 font-medium">{selectedTask.text}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[selectedTask.status]}`}>
            {statusLabels[selectedTask.status]}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${priorityDots[selectedTask.priority]}`} />
            {priorityLabels[selectedTask.priority]}
          </span>
        </div>
        <div className="mt-3 space-y-1 text-xs text-gray-500">
          <p>Ответственный: {selectedTask.dept.person}</p>
          <p>
            Срок:{" "}
            {new Date(selectedTask.dueDate + "T00:00:00").toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {selectedTask.dueTime && `, ${selectedTask.dueTime}`}
          </p>
          {selectedTask.duration && (
            <p>
              Длительность:{" "}
              {selectedTask.duration >= 60
                ? `${Math.floor(selectedTask.duration / 60)} ч${selectedTask.duration % 60 > 0 ? ` ${selectedTask.duration % 60} мин` : ""}`
                : `${selectedTask.duration} мин`}
            </p>
          )}
          {selectedTask.startDate && (
            <p>
              Начало:{" "}
              {new Date(selectedTask.startDate + "T00:00:00").toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={() => handleOpenEdit(selectedTask)}
            className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
          >
            Редактировать
          </button>
          <button
            onClick={() => handleDetailDelete(selectedTask)}
            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <DepartmentFilter
        departments={departments}
        selectedDept={selectedDept}
        onSelect={onDeptSelect}
        allLabel="Все подотделы"
      />

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
            <h2 className="text-lg font-bold text-gray-900 min-w-[160px] sm:min-w-[220px] text-center">
              {view === "month" ? capitalizedMonthLabel : weekLabel}
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
            </div>
          </div>
        </div>

        {/* ═══ MONTH VIEW ═══ */}
        {view === "month" && (
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
            <div className="grid grid-cols-7 border-b border-gray-100">
              {dayNamesShortRu.map((day, i) => (
                <div
                  key={day}
                  className={`px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide ${
                    i >= 5 ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dateKey =
                  day !== null
                    ? formatDateKey(currentMonth.year, currentMonth.month, day)
                    : "";
                const isToday = dateKey === todayKey;
                const dayOfWeek = idx % 7;
                const isWeekend = dayOfWeek >= 5;
                const tasksForDay = day !== null ? tasksByDate.get(dateKey) || [] : [];

                return (
                  <div
                    key={idx}
                    className={`min-h-[100px] border-b border-r border-gray-100 p-1.5 transition-colors ${
                      isToday
                        ? "ring-2 ring-inset ring-indigo-500 bg-indigo-50/30"
                        : day === null
                        ? "bg-gray-50/50"
                        : "hover:bg-gray-50/50"
                    }`}
                  >
                    {day !== null && (
                      <>
                        <span
                          className={`text-xs font-medium ${
                            isToday
                              ? "text-indigo-600 font-bold"
                              : isWeekend
                              ? "text-gray-400"
                              : "text-gray-600"
                          }`}
                        >
                          {day}
                        </span>
                        <div className="mt-0.5 space-y-0.5">
                          {tasksForDay.slice(0, 3).map((task) => (
                            <button
                              key={`${task.dept.id}-${task.id}`}
                              onClick={() => setSelectedTask(task)}
                              className="w-full text-left flex items-center gap-1 px-1 py-0.5 rounded text-xs hover:bg-gray-100 transition-colors"
                              style={{ borderLeft: `3px solid ${task.dept.color}` }}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityDots[task.priority]}`}
                              />
                              <span className="truncate text-gray-700">{task.text}</span>
                            </button>
                          ))}
                          {tasksForDay.length > 3 && (
                            <span className="text-xs text-gray-400 pl-1">
                              +{tasksForDay.length - 3}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        )}

        {/* ═══ WEEK VIEW WITH HOURLY GRID ═══ */}
        {view === "week" && (
          <div className="overflow-auto">
            {/* Day headers */}
            <div className="grid border-b border-gray-100 sticky top-0 bg-white z-10" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
              {/* Time gutter header */}
              <div className="border-r border-gray-100 px-1 py-3" />
              {weekDays.map((date, i) => {
                const key = formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
                const isToday = key === todayKey;
                const isWeekend = i >= 5;
                return (
                  <div
                    key={i}
                    className={`px-2 py-3 text-center border-r border-gray-100 ${
                      isToday ? "bg-indigo-50/50" : ""
                    }`}
                  >
                    <div
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        isToday ? "text-indigo-600" : isWeekend ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {DAY_NAMES_FULL_RU[i]}
                    </div>
                    <div
                      className={`text-lg font-bold mt-0.5 ${
                        isToday ? "text-indigo-600" : "text-gray-900"
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hourly grid */}
            <div
              className="grid relative"
              style={{
                gridTemplateColumns: "60px repeat(7, 1fr)",
                gridTemplateRows: `repeat(${HOURS.length}, ${HOUR_HEIGHT}px)`,
              }}
            >
              {/* Hour labels + row lines */}
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

              {/* Day column cells (background grid) */}
              {weekDays.map((date, colIdx) => {
                const key = formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
                const isToday = key === todayKey;
                return HOURS.map((_, rowIdx) => (
                  <div
                    key={`cell-${colIdx}-${rowIdx}`}
                    className={`border-r border-b border-gray-100 ${
                      isToday ? "bg-indigo-50/20" : ""
                    }`}
                    style={{ gridRow: rowIdx + 1, gridColumn: colIdx + 2 }}
                  />
                ));
              })}

              {/* Current time indicator */}
              {(() => {
                const now = new Date();
                const nowMinutes = now.getHours() * 60 + now.getMinutes();
                const startMinutes = START_HOUR * 60;
                const endMinutes = END_HOUR * 60;
                if (nowMinutes < startMinutes || nowMinutes > endMinutes) return null;

                // Check if today is in the current week
                const todayDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const dayIdx = weekDays.findIndex(
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
                      gridColumn: dayIdx + 2,
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
              })()}

              {/* Task blocks (with overlap layout) */}
              {weekDays.map((date, colIdx) => {
                const key = formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
                const tasks = tasksByDate.get(key) || [];
                const timedTasks = tasks.filter((t) => t.dueTime);

                // Build layout for overlap detection
                const layoutItems: LayoutItem[] = [];
                for (const task of timedTasks) {
                  const [h, m] = task.dueTime!.split(":").map(Number);
                  const startMin = h * 60 + m;
                  const dur = task.duration || 60;
                  if (startMin + dur < START_HOUR * 60 || startMin >= END_HOUR * 60) continue;
                  layoutItems.push({ id: `${task.dept.id}-${task.id}`, startMin, endMin: startMin + dur });
                }
                const layoutMap = layoutOverlappingItems(layoutItems);

                return timedTasks.map((task) => {
                    const [h, m] = task.dueTime!.split(":").map(Number);
                    const taskStartMin = h * 60 + m;
                    const duration = task.duration || 60;
                    const startMinutes = START_HOUR * 60;

                    const topPx = ((taskStartMin - startMinutes) / 60) * HOUR_HEIGHT;
                    const heightPx = (duration / 60) * HOUR_HEIGHT;

                    // Clamp to visible range
                    if (taskStartMin + duration < startMinutes || taskStartMin >= END_HOUR * 60)
                      return null;

                    const taskKey = `${task.dept.id}-${task.id}`;
                    const layout = layoutMap.get(taskKey);
                    const colCount = layout?.totalColumns ?? 1;
                    const colIndex = layout?.column ?? 0;
                    const widthPct = `${(1 / colCount) * 100}%`;
                    const leftPct = `${(colIndex / colCount) * 100}%`;

                    return (
                      <button
                        key={taskKey}
                        onClick={() => setSelectedTask(task)}
                        className="absolute rounded-lg px-2 py-1 text-left overflow-hidden hover:brightness-95 transition-all cursor-pointer border border-white/50"
                        style={{
                          gridColumn: colIdx + 2,
                          gridRow: "1 / -1",
                          top: Math.max(topPx, 0),
                          height: Math.min(heightPx, (END_HOUR * 60 - taskStartMin) / 60 * HOUR_HEIGHT),
                          left: leftPct,
                          width: widthPct,
                          backgroundColor: task.dept.color + "20",
                          borderLeft: `3px solid ${task.dept.color}`,
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityDots[task.priority]}`}
                          />
                          <span
                            className="text-xs font-medium truncate"
                            style={{ color: task.dept.color }}
                          >
                            {task.dueTime}
                          </span>
                        </div>
                        <p className="text-xs text-gray-800 mt-0.5 leading-tight line-clamp-2">
                          {task.text}
                        </p>
                        {heightPx > 50 && (
                          <span className="text-[10px] text-gray-500 mt-0.5 block">
                            {task.dept.person} · {duration >= 60 ? `${Math.floor(duration / 60)}ч` : ""}{duration % 60 > 0 ? `${duration % 60}м` : ""}
                          </span>
                        )}
                      </button>
                    );
                  });
              })}
            </div>
          </div>
        )}
      </div>

      {taskModal}

      {/* Task edit modal */}
      {editingTask && (
        <TaskEditModal
          task={editingTask.task}
          deptId={editingTask.deptId}
          deptName={editingTask.deptName}
          deptIcon={editingTask.deptIcon}
          onSave={handleEditSave}
          onDelete={handleEditDelete}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
