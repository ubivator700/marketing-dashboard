import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

interface EmployeeRow extends RowDataPacket {
  name: string;
  department_id: string;
  roles: string;
  color: string;
  position: string | null;
}

interface ScheduleRow extends RowDataPacket {
  id: number;
  employee_name: string;
  date: Date;
  type: "work" | "dayoff" | "vacation";
}

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [employeeRows] = await pool.query<EmployeeRow[]>(
    "SELECT * FROM employees"
  );

  const [scheduleRows] = await pool.query<ScheduleRow[]>(
    "SELECT * FROM employee_schedule"
  );

  const scheduleMap = new Map<
    string,
    { date: string; type: "work" | "dayoff" | "vacation" }[]
  >();

  for (const s of scheduleRows) {
    const entries = scheduleMap.get(s.employee_name) ?? [];
    entries.push({
      date: formatDate(s.date)!,
      type: s.type,
    });
    scheduleMap.set(s.employee_name, entries);
  }

  const employees = employeeRows.map((e) => ({
    name: e.name,
    departmentId: e.department_id,
    roles: typeof e.roles === "string" ? JSON.parse(e.roles) : e.roles,
    color: e.color,
    position: e.position ?? undefined,
    schedule: scheduleMap.get(e.name) ?? [],
  }));

  return NextResponse.json(employees);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeErr = requireWrite(session!.role, "employees");
  if (writeErr) return writeErr;

  const body = await request.json();
  const { name, departmentId, roles, color, position } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });
  }

  await pool.query(
    "INSERT INTO employees (name, department_id, roles, color, position) VALUES (?, ?, ?, ?, ?)",
    [name.trim(), departmentId || "management", JSON.stringify(roles || []), color || "#6366f1", position || null]
  );

  return NextResponse.json({
    name: name.trim(),
    departmentId: departmentId || "management",
    roles: roles || [],
    color: color || "#6366f1",
    position: position || undefined,
    schedule: [],
  }, { status: 201 });
}
