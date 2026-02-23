import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth, requireWrite } from "@/lib/api-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "posts");
  if (writeError) return writeError;

  const { id } = await params;
  const body = await request.json();
  const { title, text, topic, product, status, photoUrl, date } = body;

  await pool.query(
    "UPDATE posts SET title=?, text=?, topic=?, product=?, status=?, photo_url=?, date=? WHERE id=?",
    [title, text, topic ?? "", product ?? "other", status ?? "proposed", photoUrl ?? null, date, id]
  );

  return NextResponse.json({
    id: Number(id),
    title,
    text,
    topic: topic ?? "",
    product: product ?? "other",
    status: status ?? "proposed",
    photoUrl: photoUrl ?? null,
    date,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "posts");
  if (writeError) return writeError;

  const { id } = await params;
  await pool.query("DELETE FROM posts WHERE id=?", [id]);

  return NextResponse.json({ ok: true });
}
