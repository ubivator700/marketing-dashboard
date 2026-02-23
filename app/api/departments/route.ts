import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [departmentRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM departments ORDER BY id"
  );
  const [goalRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM goals ORDER BY id"
  );
  const [taskRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM tasks ORDER BY id"
  );

  const goalsByDept = new Map<string, any[]>();
  for (const g of goalRows) {
    const goal = {
      id: g.id,
      text: g.text,
      progress: g.progress,
      kpi: g.kpi,
    };
    if (!goalsByDept.has(g.department_id)) goalsByDept.set(g.department_id, []);
    goalsByDept.get(g.department_id)!.push(goal);
  }

  const tasksByDept = new Map<string, any[]>();
  for (const t of taskRows) {
    const task = {
      id: t.id,
      text: t.text,
      status: t.status,
      priority: t.priority,
      dueDate: formatDate(t.due_date),
      startDate: formatDate(t.start_date) ?? undefined,
      dueTime: t.due_time ?? undefined,
      duration: t.duration ?? undefined,
    };
    if (!tasksByDept.has(t.department_id)) tasksByDept.set(t.department_id, []);
    tasksByDept.get(t.department_id)!.push(task);
  }

  // Fix legacy crown emoji for management department
  for (const d of departmentRows) {
    if (d.id === "management" && d.icon === "\u{1F451}") {
      await pool.query("UPDATE departments SET icon = ? WHERE id = ?", ["\u{1F3AF}", "management"]);
      d.icon = "\u{1F3AF}";
    }
  }

  const departments = departmentRows.map((d) => ({
    id: d.id,
    name: d.name,
    person: d.person,
    color: d.color,
    icon: d.icon,
    description: d.description,
    goals: goalsByDept.get(d.id) || [],
    tasks: tasksByDept.get(d.id) || [],
  }));

  return NextResponse.json(departments);
}
