import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "stages");
  if (writeError) return writeError;

  const { id, stageId } = await params;
  const projectId = parseInt(id, 10);
  const stageIdNum = parseInt(stageId, 10);
  const body = await request.json();

  await pool.query(
    "UPDATE stages SET name=?, result=?, description=?, deadline=? WHERE id=? AND project_id=?",
    [body.name, body.result, body.description, body.deadline, stageIdNum, projectId]
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM stages WHERE id = ? AND project_id = ?",
    [stageIdNum, projectId]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  }

  const s = rows[0];
  const [taskRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM project_tasks WHERE stage_id = ? ORDER BY id",
    [stageIdNum]
  );

  const tasks = taskRows.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    assignee: t.assignee,
    deadline: formatDate(t.deadline),
    status: t.status,
    stageId: t.stage_id,
    projectId: t.project_id,
  }));

  const stage = {
    id: s.id,
    name: s.name,
    result: s.result,
    description: s.description,
    deadline: formatDate(s.deadline),
    projectId: s.project_id,
    tasks,
  };

  return NextResponse.json(stage);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "stages");
  if (writeError) return writeError;

  const { id, stageId } = await params;
  const projectId = parseInt(id, 10);
  const stageIdNum = parseInt(stageId, 10);

  await pool.query("DELETE FROM stages WHERE id = ? AND project_id = ?", [stageIdNum, projectId]);

  return NextResponse.json({ ok: true });
}
