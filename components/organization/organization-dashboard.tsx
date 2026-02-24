"use client";

import { useState, useMemo, useCallback } from "react";
import type { DepartmentId, Employee, DayType, ScheduleDay } from "@/types/dashboard";
import { useAppContext } from "@/lib/app-context";
import { dayNamesShortRu } from "@/lib/data";
import { dayTypeLabels } from "@/lib/data";

type OrgTabId = "structure" | "schedule";

const dayTypeColors: Record<DayType, string> = {
  work: "bg-green-100 text-green-700",
  dayoff: "bg-orange-100 text-orange-700",
  vacation: "bg-blue-100 text-blue-700",
};

const dayTypeCellColors: Record<DayType, string> = {
  work: "bg-green-50 hover:bg-green-100",
  dayoff: "bg-orange-50 hover:bg-orange-100",
  vacation: "bg-blue-50 hover:bg-blue-100",
};

const dayTypeCycle: DayType[] = ["work", "dayoff", "vacation"];

export default function OrganizationDashboard() {
  const { departments, setDepartments, employees, setEmployees, expenses } = useAppContext();

  const [tab, setTab] = useState<OrgTabId>("structure");
  const [selectedDept, setSelectedDept] = useState<DepartmentId | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [expandedDeptIds, setExpandedDeptIds] = useState<Set<DepartmentId>>(new Set());

  // Schedule month navigation
  const [scheduleMonth, setScheduleMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const tabs: { id: OrgTabId; label: string }[] = [
    { id: "structure", label: "Структура" },
    { id: "schedule", label: "График" },
  ];

  // ─── Structure data ───
  const filteredEmployees = useMemo(() => {
    if (!selectedDept) return employees;
    return employees.filter((e) => e.departmentId === selectedDept);
  }, [employees, selectedDept]);

  // Expenses per department
  const deptExpenses = useMemo(() => {
    const map: Record<string, number> = {};
    for (const dept of departments) {
      map[dept.id] = 0;
    }
    // sum expenses per project per department? For now just count department tasks
    return map;
  }, [departments]);

  // ─── Schedule helpers ───
  const getCalendarDays = useCallback((year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, []);

  const formatDateKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const calendarDays = useMemo(
    () => getCalendarDays(scheduleMonth.year, scheduleMonth.month),
    [scheduleMonth, getCalendarDays]
  );

  const monthLabel = new Date(scheduleMonth.year, scheduleMonth.month).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  const goToPrevMonth = () => {
    setScheduleMonth((prev) => {
      const d = new Date(prev.year, prev.month - 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const goToNextMonth = () => {
    setScheduleMonth((prev) => {
      const d = new Date(prev.year, prev.month + 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const goToToday = () => {
    const now = new Date();
    setScheduleMonth({ year: now.getFullYear(), month: now.getMonth() });
  };

  // Toggle day type for employee
  const toggleDayType = useCallback(
    (employeeName: string, dateKey: string) => {
      setEmployees((prev) =>
        prev.map((emp) => {
          if (emp.name !== employeeName) return emp;
          const existing = emp.schedule.find((s) => s.date === dateKey);
          const currentType = existing?.type ?? "work";
          const currentIdx = dayTypeCycle.indexOf(currentType);
          const nextType = dayTypeCycle[(currentIdx + 1) % dayTypeCycle.length];
          // If next is "work", remove the entry (work is default)
          if (nextType === "work") {
            return { ...emp, schedule: emp.schedule.filter((s) => s.date !== dateKey) };
          }
          if (existing) {
            return {
              ...emp,
              schedule: emp.schedule.map((s) => (s.date === dateKey ? { ...s, type: nextType } : s)),
            };
          }
          return { ...emp, schedule: [...emp.schedule, { date: dateKey, type: nextType }] };
        })
      );
    },
    [setEmployees]
  );

  const getDayType = (employee: Employee, dateKey: string): DayType => {
    const entry = employee.schedule.find((s) => s.date === dateKey);
    return entry?.type ?? "work";
  };

  // Stats
  const totalEmployees = employees.length;
  const totalDepts = departments.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Организация</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalDepts} отдел{totalDepts === 1 ? "" : totalDepts < 5 ? "а" : "ов"} · {totalEmployees} сотрудник{totalEmployees === 1 ? "" : totalEmployees < 5 ? "а" : "ов"}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
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

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Отделы</p>
            <p className="text-2xl font-black text-gray-900">{totalDepts}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Сотрудники</p>
            <p className="text-2xl font-black text-indigo-600">{totalEmployees}</p>
          </div>
        </div>

        {/* ─── Structure Tab ─── */}
        {tab === "structure" && (
          <div>
            {/* Department filter */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <button
                onClick={() => { setSelectedDept(null); setSelectedEmployee(null); }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedDept === null
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                Все
              </button>
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => { setSelectedDept(dept.id); setSelectedEmployee(null); }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    selectedDept === dept.id
                      ? "text-white shadow-md"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                  style={selectedDept === dept.id ? { backgroundColor: dept.color } : {}}
                >
                  {dept.icon} {dept.name}
                </button>
              ))}
            </div>

            {/* Departments grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {departments
                .filter((d) => !selectedDept || d.id === selectedDept)
                .map((dept) => {
                  const deptEmployees = employees.filter((e) => e.departmentId === dept.id);
                  const doneTasks = dept.tasks.filter((t) => t.status === "done").length;
                  return (
                    <div key={dept.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="h-1.5" style={{ backgroundColor: dept.color }} />
                      <div className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">{dept.icon}</span>
                          <div>
                            <h3 className="font-bold text-gray-900">{dept.name}</h3>
                            <p className="text-xs text-gray-500">{dept.description}</p>
                          </div>
                        </div>

                        {/* Expandable task list */}
                        <div className="mb-4">
                          <button
                            onClick={() => setExpandedDeptIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(dept.id)) next.delete(dept.id);
                              else next.add(dept.id);
                              return next;
                            })}
                            className="w-full flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
                          >
                            <p className="text-[9px] uppercase tracking-wider text-gray-400">Задачи</p>
                            <p className="text-sm font-bold text-gray-900">{doneTasks}/{dept.tasks.length}</p>
                            <div className="flex-1 mx-2">
                              <div className="bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full transition-all"
                                  style={{
                                    width: dept.tasks.length > 0 ? `${Math.round((doneTasks / dept.tasks.length) * 100)}%` : "0%",
                                    backgroundColor: dept.color,
                                  }}
                                />
                              </div>
                            </div>
                            <svg
                              className={`w-4 h-4 text-gray-400 transition-transform ${expandedDeptIds.has(dept.id) ? "rotate-180" : ""}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {expandedDeptIds.has(dept.id) && (
                            <div className="mt-2 space-y-1">
                              {dept.tasks.map((task) => (
                                <div key={task.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 ${task.status === "done" ? "opacity-60" : ""}`}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newStatus = task.status === "done" ? "todo" : "done";
                                      setDepartments((prev) =>
                                        prev.map((d) =>
                                          d.id !== dept.id ? d : {
                                            ...d,
                                            tasks: d.tasks.map((t) =>
                                              t.id !== task.id ? t : { ...t, status: newStatus }
                                            ),
                                          }
                                        )
                                      );
                                    }}
                                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                      task.status === "done"
                                        ? "bg-green-500 border-green-500 text-white"
                                        : "border-gray-300 hover:border-green-400"
                                    }`}
                                    title={task.status === "done" ? "Вернуть" : "Готово"}
                                  >
                                    {task.status === "done" && (
                                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                  <span className={`text-sm text-gray-800 flex-1 ${task.status === "done" ? "line-through text-gray-400" : ""}`}>{task.text}</span>
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    task.priority === "high" ? "bg-red-500"
                                    : task.priority === "medium" ? "bg-amber-500"
                                    : "bg-green-500"
                                  }`} />
                                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{task.dueDate}</span>
                                </div>
                              ))}
                              {dept.tasks.length === 0 && (
                                <p className="text-xs text-gray-400 py-2 text-center">Нет задач</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Employees */}
                        <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Сотрудники</p>
                        <div className="space-y-1.5">
                          {deptEmployees.map((emp) => (
                            <button
                              key={emp.name}
                              onClick={() => setSelectedEmployee(selectedEmployee === emp.name ? null : emp.name)}
                              className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                                selectedEmployee === emp.name ? "bg-indigo-50 ring-1 ring-indigo-200" : "hover:bg-gray-50"
                              }`}
                            >
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: emp.color }}
                              >
                                {emp.name[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{emp.name}</p>
                                <p className="text-xs text-gray-400 truncate">{emp.roles.join(", ")}</p>
                              </div>
                            </button>
                          ))}
                          {deptEmployees.length === 0 && (
                            <p className="text-xs text-gray-400 py-2 text-center">Нет сотрудников</p>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Selected employee detail */}
            {selectedEmployee && (
              <EmployeeDetail
                employee={employees.find((e) => e.name === selectedEmployee)!}
                departments={departments}
                onToggleTask={(deptId, taskId) => {
                  setDepartments((prev) =>
                    prev.map((d) =>
                      d.id !== deptId ? d : {
                        ...d,
                        tasks: d.tasks.map((t) =>
                          t.id !== taskId ? t : { ...t, status: t.status === "done" ? "todo" : "done" }
                        ),
                      }
                    )
                  );
                }}
              />
            )}
          </div>
        )}

        {/* ─── Schedule Tab ─── */}
        {tab === "schedule" && (
          <div>
            {/* Month navigation */}
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={goToPrevMonth}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                ◂
              </button>
              <span className="text-lg font-bold text-gray-900 capitalize min-w-[180px] text-center">
                {monthLabel}
              </span>
              <button
                onClick={goToNextMonth}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                ▸
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
              >
                Сегодня
              </button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-4">
              {dayTypeCycle.map((type) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className={`w-4 h-4 rounded ${dayTypeColors[type]}`} />
                  <span className="text-xs text-gray-500">{dayTypeLabels[type]}</span>
                </div>
              ))}
              <span className="text-xs text-gray-400 ml-auto">Нажмите на ячейку для смены типа дня</span>
            </div>

            {/* Schedule grid — rows = employees, columns = days */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[140px]">
                        Сотрудник
                      </th>
                      {calendarDays.map((day, i) => {
                        if (!day) return <th key={`empty-${i}`} className="px-1 py-2 w-8" />;
                        const weekDay = (day.getDay() + 6) % 7; // Mon=0
                        const isWeekend = weekDay >= 5;
                        return (
                          <th
                            key={formatDateKey(day)}
                            className={`px-1 py-2 text-center font-medium w-8 ${isWeekend ? "text-red-400" : "text-gray-500"}`}
                          >
                            <div className="text-[10px]">{dayNamesShortRu[weekDay]}</div>
                            <div>{day.getDate()}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employees.map((emp) => (
                      <tr key={emp.name}>
                        <td className="px-3 py-2 sticky left-0 bg-white z-10">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                              style={{ backgroundColor: emp.color }}
                            >
                              {emp.name[0]}
                            </div>
                            <span className="font-medium text-gray-900 whitespace-nowrap">{emp.name}</span>
                          </div>
                        </td>
                        {calendarDays.map((day, i) => {
                          if (!day) return <td key={`empty-${i}`} className="px-1 py-2" />;
                          const dateKey = formatDateKey(day);
                          const type = getDayType(emp, dateKey);
                          const todayKey = formatDateKey(new Date());
                          const isToday = dateKey === todayKey;

                          return (
                            <td key={dateKey} className="px-0.5 py-1">
                              <button
                                onClick={() => toggleDayType(emp.name, dateKey)}
                                className={`w-7 h-7 rounded-md text-[10px] font-medium transition-all ${dayTypeCellColors[type]} ${
                                  isToday ? "ring-2 ring-indigo-400" : ""
                                }`}
                                title={`${emp.name} — ${dayTypeLabels[type]}`}
                              >
                                {type === "work" ? "" : type === "dayoff" ? "В" : "О"}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Monthly summary per employee */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
              {employees.map((emp) => {
                const monthDays = calendarDays.filter(Boolean) as Date[];
                const daysOff = monthDays.filter((d) => getDayType(emp, formatDateKey(d)) === "dayoff").length;
                const vacationDays = monthDays.filter((d) => getDayType(emp, formatDateKey(d)) === "vacation").length;
                const workDays = monthDays.length - daysOff - vacationDays;

                return (
                  <div key={emp.name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: emp.color }}
                      >
                        {emp.name[0]}
                      </div>
                      <span className="text-sm font-bold text-gray-900">{emp.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-green-600 font-medium">{workDays} рабочих</span>
                      <span className="text-orange-600 font-medium">{daysOff} выходных</span>
                      <span className="text-blue-600 font-medium">{vacationDays} отгулов</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Employee Detail Card ───

function EmployeeDetail({
  employee,
  departments,
  onToggleTask,
}: {
  employee: Employee;
  departments: import("@/types/dashboard").Department[];
  onToggleTask: (deptId: string, taskId: number) => void;
}) {
  const dept = departments.find((d) => d.id === employee.departmentId);
  const deptTasks = dept?.tasks ?? [];
  const deptGoals = dept?.goals ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
          style={{ backgroundColor: employee.color }}
        >
          {employee.name[0]}
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">{employee.name}</h3>
          <p className="text-sm text-gray-500">{employee.roles.join(", ")}</p>
          {dept && <p className="text-xs text-gray-400 mt-0.5">{dept.icon} {dept.name}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tasks */}
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Задачи отдела</p>
          {deptTasks.length === 0 ? (
            <p className="text-sm text-gray-400">Нет задач</p>
          ) : (
            <div className="space-y-1">
              {deptTasks.map((task) => (
                <div key={task.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 ${task.status === "done" ? "opacity-60" : ""}`}>
                  <button
                    onClick={() => dept && onToggleTask(dept.id, task.id)}
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      task.status === "done"
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-gray-300 hover:border-green-400"
                    }`}
                    title={task.status === "done" ? "Вернуть" : "Готово"}
                  >
                    {task.status === "done" && (
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className={`text-sm text-gray-800 flex-1 ${task.status === "done" ? "line-through text-gray-400" : ""}`}>{task.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Goals */}
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Цели отдела</p>
          {deptGoals.length === 0 ? (
            <p className="text-sm text-gray-400">Нет целей</p>
          ) : (
            <div className="space-y-2">
              {deptGoals.map((goal) => (
                <div key={goal.id} className="px-3 py-2 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-800 mb-1">{goal.text}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-indigo-500"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{goal.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
