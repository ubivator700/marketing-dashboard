import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";
import { canManageUsers, hashPassword } from "@/lib/auth";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (!canManageUsers(session!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, username, role, employee_name FROM users ORDER BY id"
  );

  const users = rows.map((r) => ({
    id: r.id,
    username: r.username,
    role: r.role,
    employeeName: r.employee_name,
  }));

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  if (!canManageUsers(session!.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { username, password, role, employeeName } = body;

  if (!username || !password || !role) {
    return NextResponse.json({ error: "Username, password and role are required" }, { status: 400 });
  }

  // Check duplicate username
  const [existing] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM users WHERE username = ?",
    [username]
  );
  if (existing.length > 0) {
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const [result] = await pool.query(
    "INSERT INTO users (username, password_hash, role, employee_name) VALUES (?, ?, ?, ?)",
    [username, passwordHash, role, employeeName || null]
  );

  const insertId = (result as { insertId: number }).insertId;

  return NextResponse.json(
    { id: insertId, username, role, employeeName: employeeName || null },
    { status: 201 }
  );
}
