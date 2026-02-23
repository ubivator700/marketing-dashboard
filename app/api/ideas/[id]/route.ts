import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth, requireWrite } from "@/lib/api-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "ideas");
  if (writeError) return writeError;

  const { id } = await params;
  const body = await request.json();
  const { title, description, status, date } = body;

  await pool.query(
    "UPDATE ideas SET title=?, description=?, status=?, date=? WHERE id=?",
    [title, description ?? "", status ?? "new", date, id]
  );

  return NextResponse.json({
    id: Number(id),
    title,
    description: description ?? "",
    status: status ?? "new",
    date,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "ideas");
  if (writeError) return writeError;

  const { id } = await params;
  await pool.query("DELETE FROM ideas WHERE id=?", [id]);

  return NextResponse.json({ ok: true });
}
