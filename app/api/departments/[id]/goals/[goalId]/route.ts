import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "departments");
  if (writeError) return writeError;

  const { id, goalId } = await params;
  const goalIdNum = parseInt(goalId, 10);
  const body = await request.json();

  await pool.query(
    "UPDATE goals SET text = ?, progress = ?, kpi = ? WHERE id = ? AND department_id = ?",
    [body.text, body.progress, body.kpi, goalIdNum, id]
  );

  const goal = {
    id: goalIdNum,
    text: body.text,
    progress: body.progress,
    kpi: body.kpi,
  };

  return NextResponse.json(goal);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "departments");
  if (writeError) return writeError;

  const { id, goalId } = await params;
  const goalIdNum = parseInt(goalId, 10);

  await pool.query(
    "DELETE FROM goals WHERE id = ? AND department_id = ?",
    [goalIdNum, id]
  );

  return NextResponse.json({ ok: true });
}
