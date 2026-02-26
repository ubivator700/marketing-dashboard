import { NextRequest, NextResponse } from "next/server";
import { ResultSetHeader } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite } from "@/lib/api-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "recurring-tasks");
  if (writeError) return writeError;

  const { id } = await params;
  const body = await request.json();
  await pool.query<ResultSetHeader>(
    "UPDATE recurring_tasks SET name=?, description=?, assignee=?, recurrence_type=?, recurrence_interval=?, recurrence_days=?, channel_id=?, due_time=?, duration=?, status=? WHERE id=?",
    [
      body.name,
      body.description ?? null,
      body.assignee ?? "",
      body.recurrenceType ?? "daily",
      body.recurrenceInterval ?? 1,
      body.recurrenceDays ?? null,
      body.channelId ?? null,
      body.dueTime ?? null,
      body.duration ?? null,
      body.status ?? "active",
      id,
    ]
  );

  return NextResponse.json({ ...body, id: Number(id) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "recurring-tasks");
  if (writeError) return writeError;

  const { id } = await params;
  await pool.query("DELETE FROM recurring_tasks WHERE id=?", [id]);

  return NextResponse.json({ ok: true });
}
