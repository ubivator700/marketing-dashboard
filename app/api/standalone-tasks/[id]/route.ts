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

  const writeError = requireWrite(session!.role, "standalone-tasks");
  if (writeError) return writeError;

  const { id } = await params;
  const body = await request.json();
  await pool.query<ResultSetHeader>(
    "UPDATE standalone_tasks SET name=?, description=?, assignee=?, deadline=?, due_time=?, duration=?, status=?, channel_id=? WHERE id=?",
    [
      body.name,
      body.description ?? null,
      body.assignee ?? "",
      body.deadline ?? "",
      body.dueTime ?? null,
      body.duration ?? null,
      body.status ?? "todo",
      body.channelId ?? null,
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

  const writeError = requireWrite(session!.role, "standalone-tasks");
  if (writeError) return writeError;

  const { id } = await params;
  await pool.query("DELETE FROM standalone_tasks WHERE id=?", [id]);

  return NextResponse.json({ ok: true });
}
