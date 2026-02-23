import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { canManageUsers, hashPassword } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (!canManageUsers(session!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id, 10);
  const body = await request.json();
  const { role, employeeName, password } = body;

  if (password) {
    const passwordHash = await hashPassword(password);
    await pool.query(
      "UPDATE users SET role=?, employee_name=?, password_hash=? WHERE id=?",
      [role, employeeName || null, passwordHash, userId]
    );
  } else {
    await pool.query(
      "UPDATE users SET role=?, employee_name=? WHERE id=?",
      [role, employeeName || null, userId]
    );
  }

  return NextResponse.json({ id: userId, username: body.username, role, employeeName: employeeName || null });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (!canManageUsers(session!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id, 10);

  // Prevent deleting yourself
  if (session!.userId === userId) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  await pool.query("DELETE FROM users WHERE id=?", [userId]);

  return NextResponse.json({ ok: true });
}
