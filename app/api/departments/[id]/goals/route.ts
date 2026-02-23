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
    "INSERT INTO goals (id, text, progress, kpi, department_id) VALUES (?, ?, ?, ?, ?)",
    [body.id, body.text, body.progress, body.kpi, id]
  );

  const goal = {
    id: body.id,
    text: body.text,
    progress: body.progress,
    kpi: body.kpi,
  };

  return NextResponse.json(goal, { status: 201 });
}
