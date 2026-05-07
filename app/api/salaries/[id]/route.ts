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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const adminError = requireAdmin(session!.role);
  if (adminError) return adminError;

  const { id } = await params;
  const body = await request.json();
  const { salary, bonus, effectiveFrom, notes } = body;

  await pool.query(
    "UPDATE employee_salaries SET salary = ?, bonus = ?, effective_from = ?, notes = ? WHERE id = ?",
    [salary ?? 0, bonus ?? 0, effectiveFrom, notes ?? null, id]
  );

  const [rows] = await pool.query<SalaryRow[]>(
    "SELECT * FROM employee_salaries WHERE id = ?",
    [id]
  );
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rowToObj(rows[0]));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const adminError = requireAdmin(session!.role);
  if (adminError) return adminError;

  const { id } = await params;
  await pool.query("DELETE FROM employee_salaries WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
