import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireAdmin, formatDate } from "@/lib/api-helpers";

interface SalaryRow extends RowDataPacket {
  id: number;
  employee_name: string;
  salary: number;
  bonus: number;
  effective_from: Date;
  notes: string | null;
  created_at: Date;
}

function rowToObj(r: SalaryRow) {
  return {
    id: r.id,
    employeeName: r.employee_name,
    salary: r.salary,
    bonus: r.bonus,
    effectiveFrom: formatDate(r.effective_from),
    notes: r.notes,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

// GET — admin: вся история всех; employee: своя история
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const isAdmin = session!.role === "admin";
  let rows: SalaryRow[];
  if (isAdmin) {
    [rows] = await pool.query<SalaryRow[]>(
      "SELECT * FROM employee_salaries ORDER BY employee_name, effective_from DESC"
    );
  } else {
    if (!session!.employeeName) return NextResponse.json([]);
    [rows] = await pool.query<SalaryRow[]>(
      "SELECT * FROM employee_salaries WHERE employee_name = ? ORDER BY effective_from DESC",
      [session!.employeeName]
    );
  }

  return NextResponse.json(rows.map(rowToObj));
}

// POST — admin создаёт новую запись истории оклада
export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const adminError = requireAdmin(session!.role);
  if (adminError) return adminError;

  const body = await request.json();
  const { employeeName, salary, bonus, effectiveFrom, notes } = body;

  if (!employeeName) {
    return NextResponse.json({ error: "employeeName обязателен" }, { status: 400 });
  }
  if (!effectiveFrom) {
    return NextResponse.json({ error: "effectiveFrom обязателен" }, { status: 400 });
  }

  const [result] = await pool.query(
    "INSERT INTO employee_salaries (employee_name, salary, bonus, effective_from, notes) VALUES (?, ?, ?, ?, ?)",
    [employeeName, salary ?? 0, bonus ?? 0, effectiveFrom, notes ?? null]
  );
  const id = (result as { insertId: number }).insertId;

  const [rows] = await pool.query<SalaryRow[]>(
    "SELECT * FROM employee_salaries WHERE id = ?",
    [id]
  );
  return NextResponse.json(rowToObj(rows[0]), { status: 201 });
}
