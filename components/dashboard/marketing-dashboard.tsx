"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAppContext } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { leadsByDate, leadsForMonth } from "@/lib/lead-utils";
import { totalExpenses } from "@/lib/expense-utils";
import { calcProjectCompletion } from "@/lib/project-utils";
import { statusLabels, statusColors, dayTypeLabels } from "@/lib/data";
import type { DayType, Employee, Task, StandaloneTask } from "@/types/dashboard";

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDayType(emp: Employee, dateKey: string): DayType {
  const entry = emp.schedule.find((s) => s.date === dateKey);
  return entry?.type ?? "work";
}

export default function MarketingDashboard() {
  const {
    departments,
    setDepartments,
    employees,
    leads,
    expenses,
    channels,
    averageCheck,
    dailyLeadPlan,
    monthlyLeadPlan,
    projects,
    setProjects,
    standaloneTasks,
    setStandaloneTasks,
  } = useAppContext();

  const { user } = useAuth();
  const employeeName = user?.employeeName ?? null;

  const [tab, setTab] = useState<"today" | "month">("today");

  // Toggle department task done status
  const toggleDeptTask = (deptId: string, taskId: number) => {
    setDepartments((prev) =>
      prev.map((d) => {
        if (d.id !== deptId) return d;
        return {
          ...d,
          tasks: d.tasks.map((t) =>
            t.id === taskId ? { ...t, status: t.status === "done" ? "todo" : "done" } : t
          ),
        };
      })
    );
  };

  // Toggle project task done status
  const toggleProjectTask = (projectId: number, stageId: number, taskId: number) => {
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
                t.id === taskId ? { ...t, status: t.status === "done" ? "todo" : "done" } : t
              ),
            };
          }),
        };
      })
    );
  };

  // Toggle standalone task done status
  const toggleStandaloneTask = (taskId: number) => {
    setStandaloneTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: t.status === "done" ? "todo" : "done" } : t
      )
    );
  };

  const now = new Date();
  const todayKey = formatDateKey(now);
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // ─── Channel map ───
  const channelMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const ch of channels) {
      map[ch.id] = ch.name;
    }
    return map;
  }, [channels]);

  // ─── Daily data ───
  const todayLeads = useMemo(() => leadsByDate(leads, todayKey), [leads, todayKey]);
  const dailyPct = dailyLeadPlan > 0 ? Math.min(100, Math.round((todayLeads.length / dailyLeadPlan) * 100)) : 0;

  // Today's leads grouped by channel
  const todayLeadsByChannel = useMemo(() => {
    const map: Record<number, number> = {};
    for (const lead of todayLeads) {
      map[lead.channelId] = (map[lead.channelId] || 0) + 1;
    }
    return Object.entries(map)
      .map(([id, count]) => ({ channelId: Number(id), channelName: Number(id) === 0 ? "Неизвестен" : (channelMap[Number(id)] || `Канал #${id}`), count }))
      .sort((a, b) => b.count - a.count);
  }, [todayLeads, channelMap]);

  // Department tasks due today assigned to current user (department.person matches employeeName)
  const myTodayDeptTasks = useMemo(() => {
    if (!employeeName) return [];
    const result: { task: Task; deptId: string; deptName: string; deptColor: string }[] = [];
    for (const dept of departments) {
      if (dept.person !== employeeName) continue;
      for (const task of dept.tasks) {
        if (task.dueDate === todayKey) {
          result.push({ task, deptId: dept.id, deptName: dept.name.split("/")[0].trim(), deptColor: dept.color });
        }
      }
    }
    return result;
  }, [departments, todayKey, employeeName]);

  // Project tasks due today assigned to current user
  const myTodayProjectTasks = useMemo(() => {
    if (!employeeName) return [];
    const result: { name: string; projectName: string; status: string; projectId: number; stageId: number; taskId: number }[] = [];
    for (const project of projects) {
      for (const stage of project.stages) {
        for (const task of stage.tasks) {
          if (task.deadline === todayKey && task.assignee === employeeName) {
            result.push({ name: task.name, projectName: project.name, status: task.status, projectId: project.id, stageId: stage.id, taskId: task.id });
          }
        }
      }
    }
    return result;
  }, [projects, todayKey, employeeName]);

  // Standalone tasks due today assigned to current user
  const myTodayStandaloneTasks = useMemo(() => {
    if (!employeeName) return [];
    return standaloneTasks.filter(
      (t) => t.deadline === todayKey && t.assignee === employeeName
    );
  }, [standaloneTasks, todayKey, employeeName]);

  // Employee's expenses today
  const myTodayExpenses = useMemo(() => {
    if (!employeeName) return [];
    return expenses.filter((e) => e.date === todayKey && e.responsible === employeeName);
  }, [expenses, todayKey, employeeName]);

  const myTodayExpensesTotal = useMemo(
    () => myTodayExpenses.reduce((sum, e) => sum + e.amount, 0),
    [myTodayExpenses]
  );

  // All tasks due today (for month tab)
  const todayTasks = useMemo(() => {
    const result: { task: Task; deptId: string; deptName: string; deptColor: string }[] = [];
    for (const dept of departments) {
      for (const task of dept.tasks) {
        if (task.dueDate === todayKey) {
          result.push({ task, deptId: dept.id, deptName: dept.name.split("/")[0].trim(), deptColor: dept.color });
        }
      }
    }
    return result;
  }, [departments, todayKey]);

  // Project tasks due today (all)
  const todayProjectTasks = useMemo(() => {
    const result: { name: string; projectName: string; status: string }[] = [];
    for (const project of projects) {
      for (const stage of project.stages) {
        for (const task of stage.tasks) {
          if (task.deadline === todayKey) {
            result.push({ name: task.name, projectName: project.name, status: task.status });
          }
        }
      }
    }
    return result;
  }, [projects, todayKey]);

  // Employee status today
  const employeeStatus = useMemo(() => {
    return employees.map((emp) => ({
      ...emp,
      dayType: getDayType(emp, todayKey),
    }));
  }, [employees, todayKey]);

  // ─── Monthly data ───
  const monthLeads = useMemo(() => leadsForMonth(leads, now.getFullYear(), now.getMonth()), [leads]);
  const monthlyPct = monthlyLeadPlan > 0 ? Math.min(100, Math.round((monthLeads.length / monthlyLeadPlan) * 100)) : 0;

  const totalExpAll = useMemo(() => totalExpenses(expenses), [expenses]);
  const costPerLead = monthLeads.length > 0 ? Math.round(totalExpAll / monthLeads.length) : null;
  const monthResults = monthLeads.filter((l) => l.result === "measurement" || l.result === "sale").length;
  const costPerResult = monthResults > 0 ? Math.round(totalExpAll / monthResults) : null;

  // Tasks this month (department tasks)
  const monthTasks = useMemo(() => {
    const result: { task: Task; deptId: string; deptName: string; deptColor: string }[] = [];
    for (const dept of departments) {
      for (const task of dept.tasks) {
        if (task.dueDate.startsWith(monthPrefix)) {
          result.push({ task, deptId: dept.id, deptName: dept.name.split("/")[0].trim(), deptColor: dept.color });
        }
      }
    }
    return result;
  }, [departments, monthPrefix]);

  const monthProjectTasks = useMemo(() => {
    const result: { name: string; projectName: string; status: string; projectId: number; stageId: number; taskId: number }[] = [];
    for (const project of projects) {
      for (const stage of project.stages) {
        for (const task of stage.tasks) {
          if (task.deadline.startsWith(monthPrefix)) {
            result.push({ name: task.name, projectName: project.name, status: task.status, projectId: project.id, stageId: stage.id, taskId: task.id });
          }
        }
      }
    }
    return result;
  }, [projects, monthPrefix]);

  // Active projects (have uncompleted tasks)
  const activeProjects = useMemo(() => {
    return projects.filter((p) => {
      const allTasks = p.stages.flatMap((s) => s.tasks);
      return allTasks.length === 0 || allTasks.some((t) => t.status !== "done");
    });
  }, [projects]);

  const monthLabel = now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const todayLabel = now.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white dark:text-white">Дашборд</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">{todayLabel}</p>
        </div>

        {/* Tab switcher */}
        <div className="mb-6">
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 shadow-sm w-fit">
            <button
              onClick={() => setTab("today")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === "today"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Сегодня
            </button>
            <button
              onClick={() => setTab("month")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === "month"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              Месяц
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            TAB: СЕГОДНЯ
            ════════════════════════════════════════════════════════════════ */}
        {tab === "today" && (
          <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 capitalize">{todayLabel}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Panel 1: Задачи сотрудника */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 font-semibold">
                Задачи сотрудника
              </p>
              {!employeeName ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Пользователь не привязан к сотруднику</p>
              ) : myTodayDeptTasks.length === 0 && myTodayProjectTasks.length === 0 && myTodayStandaloneTasks.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Нет задач на сегодня</p>
              ) : (
                <div className="space-y-1 ">
                  {/* Department tasks */}
                  {myTodayDeptTasks.map((item) => (
                    <div key={`dept-${item.task.id}`} className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 ${item.task.status === "done" ? "opacity-60" : ""}`}>
                      <button
                        onClick={() => toggleDeptTask(item.deptId, item.task.id)}
                        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                          item.task.status === "done"
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-gray-300 hover:border-green-400"
                        }`}
                        title={item.task.status === "done" ? "Вернуть" : "Готово"}
                      >
                        {item.task.status === "done" && (
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span className={`text-sm text-gray-800 dark:text-gray-200 flex-1 ${item.task.status === "done" ? "line-through text-gray-400" : ""}`}>{item.task.text}</span>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">{item.deptName}</span>
                    </div>
                  ))}
                  {/* Project tasks */}
                  {myTodayProjectTasks.map((item) => (
                    <div key={`proj-${item.taskId}`} className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/20 ${item.status === "done" ? "opacity-60" : ""}`}>
                      <button
                        onClick={() => toggleProjectTask(item.projectId, item.stageId, item.taskId)}
                        className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                          item.status === "done"
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-gray-300 hover:border-green-400"
                        }`}
                        title={item.status === "done" ? "Вернуть" : "Готово"}
                      >
                        {item.status === "done" && (
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span className={`text-sm text-gray-800 dark:text-gray-200 flex-1 ${item.status === "done" ? "line-through text-gray-400" : ""}`}>{item.name}</span>
                      <span className="text-[10px] text-indigo-500 flex-shrink-0">{item.projectName}</span>
                    </div>
                  ))}
                  {/* Standalone tasks */}
                  {myTodayStandaloneTasks.map((task) => (
                    <div key={`standalone-${task.id}`} className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50/50 dark:bg-amber-900/20 ${task.status === "done" ? "opacity-60" : ""}`}>
                      <button
                        onClick={() => toggleStandaloneTask(task.id)}
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
                      <span className={`text-sm text-gray-800 dark:text-gray-200 flex-1 ${task.status === "done" ? "line-through text-gray-400" : ""}`}>{task.name}</span>
                      <span className="text-[10px] text-amber-500 flex-shrink-0">Задача</span>
                    </div>
                  ))}
                </div>
              )}
              {employeeName && (
                <p className="text-[10px] text-gray-400 mt-2">
                  {myTodayDeptTasks.length + myTodayProjectTasks.length + myTodayStandaloneTasks.length} задач
                </p>
              )}
            </div>

            {/* Panel 2: Лиды за сегодня */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 font-semibold">
                Лиды за сегодня
              </p>

              {/* Daily plan completion bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {todayLeads.length} / {dailyLeadPlan}
                  </span>
                  <span className={`text-xs font-bold ${
                    dailyPct >= 100 ? "text-green-600" : dailyPct >= 50 ? "text-amber-600" : "text-red-500"
                  }`}>
                    {dailyPct}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      dailyPct >= 100 ? "bg-green-500" : dailyPct >= 50 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${dailyPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Выполнение дневного плана</p>
              </div>

              {/* Leads by channel */}
              {todayLeadsByChannel.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Нет лидов за сегодня</p>
              ) : (
                <div className="space-y-1.5">
                  {todayLeadsByChannel.map((item) => (
                    <div key={item.channelId} className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{item.channelName}</span>
                      <span className="text-sm font-bold text-indigo-600 flex-shrink-0 ml-2">{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Panel 3: Расходы сотрудника за сегодня */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 font-semibold">
                Расходы сотрудника за сегодня
              </p>
              {!employeeName ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Пользователь не привязан к сотруднику</p>
              ) : myTodayExpenses.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Нет расходов за сегодня</p>
              ) : (
                <div className="space-y-1.5">
                  {myTodayExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                      <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{expense.name}</span>
                      <span className="text-sm font-semibold text-red-500 flex-shrink-0 ml-2">
                        {expense.amount.toLocaleString("ru-RU")} ₽
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {employeeName && myTodayExpenses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Итого</span>
                  <span className="text-sm font-bold text-red-600">
                    {myTodayExpensesTotal.toLocaleString("ru-RU")} ₽
                  </span>
                </div>
              )}
            </div>
          </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB: МЕСЯЦ
            ════════════════════════════════════════════════════════════════ */}
        {tab === "month" && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1.5 h-7 rounded-full bg-emerald-500" />
              <h2 className="text-lg font-black text-gray-900 dark:text-white capitalize">{monthLabel}</h2>
            </div>

            {/* KPI cards row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
              {/* Plan completion */}
              <KpiCard
                label="Выполнение плана"
                value={`${monthLeads.length} / ${monthlyLeadPlan}`}
                sub="лидов"
                pct={monthlyPct}
                color={monthlyPct >= 100 ? "#10b981" : monthlyPct >= 50 ? "#f59e0b" : "#ef4444"}
              />
              {/* Expenses */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 font-semibold">Расходы (общие)</p>
                <p className="text-2xl font-black text-red-500">
                  {totalExpAll.toLocaleString("ru-RU")}
                  <span className="text-sm font-normal text-gray-400 ml-1">₽</span>
                </p>
              </div>
              {/* Cost per lead */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 font-semibold">Стоимость лида</p>
                <p className="text-2xl font-black text-amber-600">
                  {costPerLead !== null ? costPerLead.toLocaleString("ru-RU") : "—"}
                  <span className="text-sm font-normal text-gray-400 ml-1">₽</span>
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  {monthLeads.filter((l) => l.result === "sale").length} продаж · {monthLeads.filter((l) => l.result === "measurement").length} замеров
                </p>
              </div>
              {/* Cost per result */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 font-semibold">Стоимость результата</p>
                <p className="text-2xl font-black text-teal-600">
                  {costPerResult !== null ? costPerResult.toLocaleString("ru-RU") : "—"}
                  <span className="text-sm font-normal text-gray-400 ml-1">₽</span>
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  {monthResults} результат{monthResults === 1 ? "" : monthResults < 5 ? "а" : "ов"}
                </p>
              </div>
              {/* Tasks summary */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 font-semibold">Задачи за месяц</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white">{monthTasks.length + monthProjectTasks.length}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  {monthTasks.filter((t) => t.task.status === "done").length + monthProjectTasks.filter((t) => t.status === "done").length} выполнено · {monthTasks.filter((t) => t.task.status === "in_progress").length + monthProjectTasks.filter((t) => t.status === "in_progress").length} в работе
                </p>
              </div>
            </div>

            {/* Three blocks: projects + tasks + employees */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Active projects */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 font-semibold">
                  Актуальные проекты ({activeProjects.length})
                </p>
                {activeProjects.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Нет активных проектов</p>
                ) : (
                  <div className="space-y-2 ">
                    {activeProjects.map((project) => {
                      const completion = calcProjectCompletion(project);
                      const allTasks = project.stages.flatMap((s) => s.tasks);
                      const inProgress = allTasks.filter((t) => t.status === "in_progress").length;
                      const done = allTasks.filter((t) => t.status === "done").length;
                      const deadlineDate = new Date(project.deadline + "T00:00:00");
                      const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                      return (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          className="block px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white flex-1 min-w-0 truncate">{project.name}</p>
                            <span className="text-xs font-bold text-indigo-600 flex-shrink-0">{completion}%</span>
                          </div>
                          {/* Progress bar */}
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-2">
                            <div
                              className="h-1.5 rounded-full bg-indigo-500 transition-all"
                              style={{ width: `${completion}%` }}
                            />
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-gray-500">
                            <span>{done}/{allTasks.length} задач</span>
                            {inProgress > 0 && <span className="text-blue-600">{inProgress} в работе</span>}
                            <span className={daysLeft < 7 ? "text-red-500 font-semibold" : ""}>
                              {daysLeft > 0 ? `${daysLeft} дн.` : "просрочен"}
                            </span>
                            {project.responsible && (
                              <span className="text-gray-400 ml-auto">{project.responsible}</span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tasks this month */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 font-semibold">
                  Задачи на месяц ({monthTasks.length + monthProjectTasks.length})
                </p>
                {monthTasks.length === 0 && monthProjectTasks.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">Нет задач</p>
                ) : (
                  <div className="space-y-1 ">
                    {monthTasks.map((item) => (
                      <div key={`dept-${item.task.id}`} className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 ${item.task.status === "done" ? "opacity-60" : ""}`}>
                        <button
                          onClick={() => toggleDeptTask(item.deptId, item.task.id)}
                          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            item.task.status === "done"
                              ? "bg-green-500 border-green-500 text-white"
                              : "border-gray-300 hover:border-green-400"
                          }`}
                          title={item.task.status === "done" ? "Вернуть" : "Готово"}
                        >
                          {item.task.status === "done" && (
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span className={`text-sm text-gray-800 dark:text-gray-200 flex-1 ${item.task.status === "done" ? "line-through text-gray-400" : ""}`}>{item.task.text}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {new Date(item.task.dueDate + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    ))}
                    {monthProjectTasks.map((item) => (
                      <div key={`proj-${item.taskId}`} className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/20 ${item.status === "done" ? "opacity-60" : ""}`}>
                        <button
                          onClick={() => toggleProjectTask(item.projectId, item.stageId, item.taskId)}
                          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            item.status === "done"
                              ? "bg-green-500 border-green-500 text-white"
                              : "border-gray-300 hover:border-green-400"
                          }`}
                          title={item.status === "done" ? "Вернуть" : "Готово"}
                        >
                          {item.status === "done" && (
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span className={`text-sm text-gray-800 dark:text-gray-200 flex-1 ${item.status === "done" ? "line-through text-gray-400" : ""}`}>{item.name}</span>
                        <span className="text-[10px] text-indigo-500 flex-shrink-0">{item.projectName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Employees this month — off days summary */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 font-semibold">
                  График сотрудников
                </p>
                <div className="space-y-2">
                  {employees.map((emp) => {
                    const offDays = emp.schedule.filter((s) => s.date.startsWith(monthPrefix) && s.type === "dayoff").length;
                    const vacDays = emp.schedule.filter((s) => s.date.startsWith(monthPrefix) && s.type === "vacation").length;
                    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                    const workDays = daysInMonth - offDays - vacDays;

                    return (
                      <div key={emp.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: emp.color }}
                        >
                          {emp.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{emp.name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[10px] text-green-600 font-medium">{workDays} раб.</span>
                            {offDays > 0 && <span className="text-[10px] text-orange-600 font-medium">{offDays} вых.</span>}
                            {vacDays > 0 && <span className="text-[10px] text-blue-600 font-medium">{vacDays} отг.</span>}
                          </div>
                        </div>
                        {/* Mini bar showing ratio */}
                        <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
                          <div
                            className="h-full bg-green-400 rounded-full"
                            style={{ width: `${(workDays / daysInMonth) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center py-6 text-xs text-gray-400 dark:text-gray-500">
          Дашборд маркетингового отдела
        </div>
      </div>
    </div>
  );
}

// ─── KPI Card with ring chart ─────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  pct,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  pct: number;
  color: string;
}) {
  const r = 24;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(pct, 100) / 100);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
      <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 font-semibold">{label}</p>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-xl font-black text-gray-900 dark:text-white">{value}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">{sub}</p>
        </div>
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4.5" />
            <circle
              cx="28" cy="28" r={r}
              fill="none"
              stroke={color}
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-black text-gray-900 dark:text-white">{pct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
