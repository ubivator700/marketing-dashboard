"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Project, Expense, Channel, Lead, Department, Employee, StandaloneTask } from "@/types/dashboard";
import { useAuth } from "@/lib/auth-context";

// ─── Context interface (unchanged — all components stay compatible) ──

interface AppContextValue {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  channels: Channel[];
  setChannels: React.Dispatch<React.SetStateAction<Channel[]>>;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  averageCheck: number;
  setAverageCheck: React.Dispatch<React.SetStateAction<number>>;
  monthlyLeadPlan: number;
  setMonthlyLeadPlan: React.Dispatch<React.SetStateAction<number>>;
  dailyLeadPlan: number;
  monthlyBudget: number;
  setMonthlyBudget: React.Dispatch<React.SetStateAction<number>>;
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  standaloneTasks: StandaloneTask[];
  setStandaloneTasks: React.Dispatch<React.SetStateAction<StandaloneTask[]>>;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Safe fetch with error handling ────────────────────────────────

async function safeFetch(url: string, options: RequestInit): Promise<boolean> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[sync] ${options.method} ${url} → ${res.status}`, text);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[sync] ${options.method} ${url} network error:`, err);
    return false;
  }
}

// ─── Diff-and-sync helpers ──────────────────────────────────────────

function findById<T extends { id: number | string }>(arr: T[], id: number | string) {
  return arr.find((item) => item.id === id);
}

function jsonEq(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Detect created / updated / deleted items and push to API */
async function syncArray<T extends { id: number | string }>(
  endpoint: string,
  prev: T[],
  next: T[],
) {
  const prevIds = new Set(prev.map((i) => i.id));
  const nextIds = new Set(next.map((i) => i.id));

  const promises: Promise<boolean>[] = [];

  // Deleted
  for (const id of prevIds) {
    if (!nextIds.has(id)) {
      promises.push(safeFetch(`${endpoint}/${id}`, { method: "DELETE" }));
    }
  }

  // Created
  for (const item of next) {
    if (!prevIds.has(item.id)) {
      promises.push(safeFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      }));
    }
  }

  // Updated
  for (const item of next) {
    if (prevIds.has(item.id)) {
      const old = findById(prev, item.id);
      if (old && !jsonEq(old, item)) {
        promises.push(safeFetch(`${endpoint}/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        }));
      }
    }
  }

  await Promise.all(promises);
}

// ─── Employee schedule sync helper ──────────────────────────────────

async function syncEmployees(prev: Employee[], next: Employee[]) {
  for (const emp of next) {
    const old = prev.find((e) => e.name === emp.name);
    if (old && !jsonEq(old.schedule, emp.schedule)) {
      await safeFetch(`/api/employees/${encodeURIComponent(emp.name)}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule: emp.schedule }),
      });
    }
  }
}

// ─── Settings sync helper ───────────────────────────────────────────

async function syncSettings(key: string, prev: number, next: number) {
  if (prev !== next) {
    await safeFetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next }),
    });
  }
}

// ─── Department sync (goals + tasks are nested) ─────────────────────

async function syncDepartments(prev: Department[], next: Department[]) {
  const promises: Promise<boolean>[] = [];

  for (const dept of next) {
    const oldDept = prev.find((d) => d.id === dept.id);
    if (!oldDept) continue;

    // Sync goals
    const oldGoalIds = new Set(oldDept.goals.map((g) => g.id));
    const newGoalIds = new Set(dept.goals.map((g) => g.id));

    for (const gid of oldGoalIds) {
      if (!newGoalIds.has(gid)) {
        promises.push(safeFetch(`/api/departments/${dept.id}/goals/${gid}`, { method: "DELETE" }));
      }
    }
    for (const goal of dept.goals) {
      if (!oldGoalIds.has(goal.id)) {
        promises.push(safeFetch(`/api/departments/${dept.id}/goals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(goal),
        }));
      } else {
        const oldGoal = oldDept.goals.find((g) => g.id === goal.id);
        if (oldGoal && !jsonEq(oldGoal, goal)) {
          promises.push(safeFetch(`/api/departments/${dept.id}/goals/${goal.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(goal),
          }));
        }
      }
    }

    // Sync tasks
    const oldTaskIds = new Set(oldDept.tasks.map((t) => t.id));
    const newTaskIds = new Set(dept.tasks.map((t) => t.id));

    for (const tid of oldTaskIds) {
      if (!newTaskIds.has(tid)) {
        promises.push(safeFetch(`/api/departments/${dept.id}/tasks/${tid}`, { method: "DELETE" }));
      }
    }
    for (const task of dept.tasks) {
      if (!oldTaskIds.has(task.id)) {
        promises.push(safeFetch(`/api/departments/${dept.id}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(task),
        }));
      } else {
        const oldTask = oldDept.tasks.find((t) => t.id === task.id);
        if (oldTask && !jsonEq(oldTask, task)) {
          promises.push(safeFetch(`/api/departments/${dept.id}/tasks/${task.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(task),
          }));
        }
      }
    }
  }

  await Promise.all(promises);
}

// ─── Provider ──────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [averageCheck, setAverageCheck] = useState<number>(0);
  const [monthlyLeadPlan, setMonthlyLeadPlan] = useState<number>(0);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [standaloneTasks, setStandaloneTasks] = useState<StandaloneTask[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Refs for previous values (used to compute diffs in sync effects)
  const prevProjects = useRef<Project[]>([]);
  const prevExpenses = useRef<Expense[]>([]);
  const prevChannels = useRef<Channel[]>([]);
  const prevLeads = useRef<Lead[]>([]);
  const prevAvgCheck = useRef<number>(0);
  const prevMonthlyPlan = useRef<number>(0);
  const prevMonthlyBudget = useRef<number>(0);
  const prevDepartments = useRef<Department[]>([]);
  const prevEmployees = useRef<Employee[]>([]);
  const prevStandaloneTasks = useRef<StandaloneTask[]>([]);

  // ─── Load from API on mount (after auth resolves) ─────────────
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;

    Promise.all([
      fetch("/api/projects").then((r) => r.ok ? r.json() : []),
      fetch("/api/expenses").then((r) => r.ok ? r.json() : []),
      fetch("/api/channels").then((r) => r.ok ? r.json() : []),
      fetch("/api/leads").then((r) => r.ok ? r.json() : []),
      fetch("/api/settings").then((r) => r.ok ? r.json() : {}) as Promise<{ averageCheck?: number; monthlyLeadPlan?: number; monthlyBudget?: number }>,
      fetch("/api/departments").then((r) => r.ok ? r.json() : []),
      fetch("/api/employees").then((r) => r.ok ? r.json() : []),
      fetch("/api/standalone-tasks").then((r) => r.ok ? r.json() : []),
    ]).then(([proj, exp, ch, ld, settings, deps, emps, stasks]) => {
      if (cancelled) return;

      setProjects(proj);
      setExpenses(exp);
      setChannels(ch);
      setLeads(ld);
      setAverageCheck(settings.averageCheck ?? 0);
      setMonthlyLeadPlan(settings.monthlyLeadPlan ?? 0);
      setMonthlyBudget(settings.monthlyBudget ?? 0);
      setDepartments(deps);
      setEmployees(emps);
      setStandaloneTasks(stasks);

      prevProjects.current = proj;
      prevExpenses.current = exp;
      prevChannels.current = ch;
      prevLeads.current = ld;
      prevAvgCheck.current = settings.averageCheck ?? 0;
      prevMonthlyPlan.current = settings.monthlyLeadPlan ?? 0;
      prevMonthlyBudget.current = settings.monthlyBudget ?? 0;
      prevDepartments.current = deps;
      prevEmployees.current = emps;
      prevStandaloneTasks.current = stasks;

      setDataLoaded(true);
    });

    return () => { cancelled = true; };
  }, [authLoading, user]);

  // ─── Sync effects: fire API calls when state changes ─────────────
  // Each effect compares current state with the previous ref,
  // syncs the diff to the server, then updates the ref.

  useEffect(() => {
    if (!dataLoaded) return;
    const prev = prevProjects.current;
    prevProjects.current = projects;
    if (prev !== projects) syncArray("/api/projects", prev, projects);
  }, [projects, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    const prev = prevExpenses.current;
    prevExpenses.current = expenses;
    if (prev !== expenses) syncArray("/api/expenses", prev, expenses);
  }, [expenses, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    const prev = prevChannels.current;
    prevChannels.current = channels;
    if (prev !== channels) syncArray("/api/channels", prev, channels);
  }, [channels, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    const prev = prevLeads.current;
    prevLeads.current = leads;
    if (prev !== leads) syncArray("/api/leads", prev, leads);
  }, [leads, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    const prev = prevAvgCheck.current;
    prevAvgCheck.current = averageCheck;
    if (prev !== averageCheck) syncSettings("averageCheck", prev, averageCheck);
  }, [averageCheck, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    const prev = prevMonthlyPlan.current;
    prevMonthlyPlan.current = monthlyLeadPlan;
    if (prev !== monthlyLeadPlan) syncSettings("monthlyLeadPlan", prev, monthlyLeadPlan);
  }, [monthlyLeadPlan, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    const prev = prevMonthlyBudget.current;
    prevMonthlyBudget.current = monthlyBudget;
    if (prev !== monthlyBudget) syncSettings("monthlyBudget", prev, monthlyBudget);
  }, [monthlyBudget, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    const prev = prevDepartments.current;
    prevDepartments.current = departments;
    if (prev !== departments) syncDepartments(prev, departments);
  }, [departments, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    const prev = prevEmployees.current;
    prevEmployees.current = employees;
    if (prev !== employees) syncEmployees(prev, employees);
  }, [employees, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    const prev = prevStandaloneTasks.current;
    prevStandaloneTasks.current = standaloneTasks;
    if (prev !== standaloneTasks) syncArray("/api/standalone-tasks", prev, standaloneTasks);
  }, [standaloneTasks, dataLoaded]);

  // ─── Computed daily lead plan (derived from monthly plan) ─────────
  const dailyLeadPlan = useMemo(() => {
    if (monthlyLeadPlan <= 0) return 0;
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.round(monthlyLeadPlan / daysInMonth);
  }, [monthlyLeadPlan]);

  // Not authenticated — render children directly (login page, etc.)
  // Middleware handles redirecting protected pages to /login
  if (!user && !authLoading) {
    return <>{children}</>;
  }

  // Show loading spinner while auth or data is loading
  if (authLoading || (!dataLoaded && user)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="mt-3 text-sm text-gray-500">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        projects, setProjects,
        expenses, setExpenses,
        channels, setChannels,
        leads, setLeads,
        averageCheck, setAverageCheck,
        monthlyLeadPlan, setMonthlyLeadPlan,
        dailyLeadPlan,
        monthlyBudget, setMonthlyBudget,
        departments, setDepartments,
        employees, setEmployees,
        standaloneTasks, setStandaloneTasks,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
