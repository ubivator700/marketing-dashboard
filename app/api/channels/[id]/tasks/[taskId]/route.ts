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
  const writeError = requireWrite(session!.role, "channel_tasks");
  if (writeError) return writeError;

  const { id, taskId } = await params;
  const channelId = parseInt(id, 10);
  const taskIdNum = parseInt(taskId, 10);
  const body = await request.json();

  await pool.query(
    "UPDATE channel_tasks SET text = ?, done = ?, deadline = ? WHERE id = ? AND channel_id = ?",
    [body.text, body.done, body.deadline || null, taskIdNum, channelId]
  );

  const task = {
    id: taskIdNum,
    text: body.text,
    done: Boolean(body.done),
    deadline: body.deadline ?? undefined,
  };

  return NextResponse.json(task);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "channel_tasks");
  if (writeError) return writeError;

  const { id, taskId } = await params;
  const channelId = parseInt(id, 10);
  const taskIdNum = parseInt(taskId, 10);

  await pool.query(
    "DELETE FROM channel_tasks WHERE id = ? AND channel_id = ?",
    [taskIdNum, channelId]
  );

  return NextResponse.json({ ok: true });
}
