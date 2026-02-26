import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth, requireWrite } from "@/lib/api-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "product-types");
  if (writeError) return writeError;

  const { id } = await params;
  const body = await request.json();
  const { name, category, avgCheck, avgMarkup } = body;

  await pool.query(
    "UPDATE product_types SET name=?, category=?, avg_check=?, avg_markup=? WHERE id=?",
    [name, category ?? "other", avgCheck ?? 0, avgMarkup ?? 0, id]
  );

  return NextResponse.json({
    id: Number(id),
    name,
    category: category ?? "other",
    avgCheck: avgCheck ?? 0,
    avgMarkup: avgMarkup ?? 0,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "product-types");
  if (writeError) return writeError;

  const { id } = await params;

  await pool.query("DELETE FROM product_types WHERE id=?", [id]);

  return NextResponse.json({ ok: true });
}
