import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "departments");
  if (writeError) return writeError;

  const { id, taskId } = await params;
  const taskIdNum = parseInt(taskId, 10);
  const body = await request.json();

  await pool.query(
    "UPDATE tasks SET text = ?, status = ?, priority = ?, due_date = ?, start_date = ?, due_time = ?, duration = ? WHERE id = ? AND department_id = ?",
    [
      body.text,
      body.status,
      body.priority,
      body.dueDate,
      body.startDate || null,
      body.dueTime || null,
      body.duration || null,
      taskIdNum,
      id,
    ]
  );

  const task = {
    id: taskIdNum,
    text: body.text,
    status: body.status,
    priority: body.priority,
    dueDate: body.dueDate,
    startDate: body.startDate ?? undefined,
    dueTime: body.dueTime ?? undefined,
    duration: body.duration ?? undefined,
  };

  return NextResponse.json(task);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "departments");
  if (writeError) return writeError;

  const { id, taskId } = await params;
  const taskIdNum = parseInt(taskId, 10);

  await pool.query(
    "DELETE FROM tasks WHERE id = ? AND department_id = ?",
    [taskIdNum, id]
  );

  return NextResponse.json({ ok: true });
}
