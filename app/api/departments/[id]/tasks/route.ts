import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "departments");
  if (writeError) return writeError;

  const { id } = await params;
  const body = await request.json();

  await pool.query(
    "INSERT INTO tasks (id, text, status, priority, due_date, start_date, due_time, duration, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      body.id,
      body.text,
      body.status,
      body.priority,
      body.dueDate,
      body.startDate || null,
      body.dueTime || null,
      body.duration || null,
      id,
    ]
  );

  const task = {
    id: body.id,
    text: body.text,
    status: body.status,
    priority: body.priority,
    dueDate: body.dueDate,
    startDate: body.startDate ?? undefined,
    dueTime: body.dueTime ?? undefined,
    duration: body.duration ?? undefined,
  };

  return NextResponse.json(task, { status: 201 });
}
