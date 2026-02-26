import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth, requireWrite } from "@/lib/api-helpers";

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
  const { name, channelId, contactMethod, result, date, note, storeId, productTypeIds } = body;

  // channelId=0 means "unknown channel" — store as NULL in DB
  const dbChannelId = channelId === 0 ? null : channelId;
  const ptIds: number[] = Array.isArray(productTypeIds) ? productTypeIds : [];

  await pool.query(
    "UPDATE leads SET name=?, channel_id=?, contact_method=?, result=?, date=?, note=?, store_id=? WHERE id=?",
    [name, dbChannelId, contactMethod, result, date, note ?? null, storeId ?? null, id]
  );

  // Replace junction rows: delete old, insert new
  await pool.query("DELETE FROM lead_product_types WHERE lead_id = ?", [id]);
  if (ptIds.length > 0) {
    const values = ptIds.map((ptId) => [Number(id), ptId]);
    await pool.query(
      "INSERT INTO lead_product_types (lead_id, product_type_id) VALUES ?",
      [values]
    );
  }

  return NextResponse.json({
    id: Number(id),
    name,
    channelId,
    contactMethod,
    result,
    date,
    note: note ?? null,
    storeId: storeId ?? null,
    productTypeIds: ptIds,
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

  // Junction rows auto-deleted via ON DELETE CASCADE
  await pool.query("DELETE FROM leads WHERE id=?", [id]);

  return NextResponse.json({ ok: true });
}
