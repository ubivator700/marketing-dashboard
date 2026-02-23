import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "expenses");
  if (writeError) return writeError;

  const { id } = await params;
  const body = await request.json();
  const { name, amount, responsible, date, projectId, channelId } = body;

  await pool.query(
    "UPDATE expenses SET name=?, amount=?, responsible=?, date=?, project_id=?, channel_id=? WHERE id=?",
    [name, amount, responsible, date, projectId ?? null, channelId ?? null, id]
  );

  return NextResponse.json({
    id: Number(id),
    name,
    amount,
    responsible,
    date,
    projectId: projectId ?? null,
    channelId: channelId ?? null,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "expenses");
  if (writeError) return writeError;

  const { id } = await params;

  await pool.query("DELETE FROM expenses WHERE id=?", [id]);

  return NextResponse.json({ ok: true });
}
