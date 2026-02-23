import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string; taskId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "tasks");
  if (writeError) return writeError;

  const { id, stageId, taskId } = await params;
  const projectId = parseInt(id, 10);
  const stageIdNum = parseInt(stageId, 10);
  const taskIdNum = parseInt(taskId, 10);
  const body = await request.json();

  await pool.query(
    "UPDATE project_tasks SET name=?, description=?, assignee=?, deadline=?, status=? WHERE id=?",
    [body.name, body.description, body.assignee, body.deadline, body.status, taskIdNum]
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM project_tasks WHERE id = ?",
    [taskIdNum]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const t = rows[0];
  const task = {
    id: t.id,
    name: t.name,
    description: t.description,
    assignee: t.assignee,
    deadline: formatDate(t.deadline),
    status: t.status,
    stageId: t.stage_id,
    projectId: t.project_id,
  };

  return NextResponse.json(task);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string; taskId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "tasks");
  if (writeError) return writeError;

  const { taskId } = await params;
  const taskIdNum = parseInt(taskId, 10);

  await pool.query("DELETE FROM project_tasks WHERE id = ?", [taskIdNum]);

  return NextResponse.json({ ok: true });
}
