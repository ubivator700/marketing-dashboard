import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth, requireWrite } from "@/lib/api-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "stores");
  if (writeError) return writeError;

  const { id } = await params;
  const body = await request.json();
  const { name, tbu } = body;

  await pool.query("UPDATE stores SET name=?, tbu=? WHERE id=?", [name, tbu ?? 0, id]);

  return NextResponse.json({ id: Number(id), name, tbu: tbu ?? 0 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "stores");
  if (writeError) return writeError;

  const { id } = await params;

  await pool.query("DELETE FROM stores WHERE id=?", [id]);

  return NextResponse.json({ ok: true });
}
