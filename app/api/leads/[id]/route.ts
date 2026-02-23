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

  const writeError = requireWrite(session!.role, "leads");
  if (writeError) return writeError;

  const { id } = await params;
  const body = await request.json();
  const { name, channelId, contactMethod, result, date, note } = body;

  await pool.query(
    "UPDATE leads SET name=?, channel_id=?, contact_method=?, result=?, date=?, note=? WHERE id=?",
    [name, channelId, contactMethod, result, date, note ?? null, id]
  );

  return NextResponse.json({
    id: Number(id),
    name,
    channelId,
    contactMethod,
    result,
    date,
    note: note ?? null,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "leads");
  if (writeError) return writeError;

  const { id } = await params;

  await pool.query("DELETE FROM leads WHERE id=?", [id]);

  return NextResponse.json({ ok: true });
}
