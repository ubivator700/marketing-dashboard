import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "tasks");
  if (writeError) return writeError;

  const { id, stageId } = await params;
  const projectId = parseInt(id, 10);
  const stageIdNum = parseInt(stageId, 10);
  const body = await request.json();

  const [result] = await pool.query<RowDataPacket[] & { insertId: number }>(
    "INSERT INTO project_tasks (name, description, assignee, deadline, status, stage_id, project_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [body.name, body.description, body.assignee, body.deadline, body.status, stageIdNum, projectId]
  );
  const taskId = (result as any).insertId;

  const task = {
    id: taskId,
    name: body.name,
    description: body.description,
    assignee: body.assignee,
    deadline: body.deadline,
    status: body.status,
    stageId: stageIdNum,
    projectId: projectId,
  };

  return NextResponse.json(task, { status: 201 });
}
