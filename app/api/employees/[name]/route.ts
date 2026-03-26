import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth, requireWrite } from "@/lib/api-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeErr = requireWrite(session!.role, "employees");
  if (writeErr) return writeErr;

  const { name: oldName } = await params;
  const body = await request.json();
  const { name, departmentId, roles, color, position } = body;

  const newName = (name ?? oldName).trim();

  // If name changed, we need to update the PK
  if (newName !== decodeURIComponent(oldName)) {
    await pool.query(
      "UPDATE employees SET name = ?, department_id = ?, roles = ?, color = ?, position = ? WHERE name = ?",
      [newName, departmentId, JSON.stringify(roles || []), color, position || null, decodeURIComponent(oldName)]
    );
  } else {
    await pool.query(
      "UPDATE employees SET department_id = ?, roles = ?, color = ?, position = ? WHERE name = ?",
      [departmentId, JSON.stringify(roles || []), color, position || null, decodeURIComponent(oldName)]
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeErr = requireWrite(session!.role, "employees");
  if (writeErr) return writeErr;

  const { name } = await params;
  await pool.query("DELETE FROM employees WHERE name = ?", [decodeURIComponent(name)]);

  return NextResponse.json({ success: true });
}
