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
  const writeError = requireWrite(session!.role, "stages");
  if (writeError) return writeError;

  const { id } = await params;
  const projectId = parseInt(id, 10);
  const body = await request.json();

  const [result] = await pool.query<RowDataPacket[] & { insertId: number }>(
    "INSERT INTO stages (name, result, description, deadline, project_id) VALUES (?, ?, ?, ?, ?)",
    [body.name, body.result, body.description, body.deadline, projectId]
  );
  const stageId = (result as any).insertId;

  const stage = {
    id: stageId,
    name: body.name,
    result: body.result,
    description: body.description,
    deadline: body.deadline,
    projectId: projectId,
    tasks: [],
  };

  return NextResponse.json(stage, { status: 201 });
}
