import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAuth, requireWrite } from "@/lib/api-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const { status, acceptedBy, taskId } = body;

  if (status) {
    await pool.query(
      "UPDATE design_orders SET status = ?, accepted_by = ?, task_id = ? WHERE id = ?",
      [status, acceptedBy || null, taskId || null, Number(id)]
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  // Delete attachments files
  const [attachRows] = await pool.query<any[]>(
    "SELECT file_path FROM design_order_attachments WHERE order_id = ?",
    [Number(id)]
  );
  const fs = require("fs");
  const path = require("path");
  for (const row of attachRows) {
    const fullPath = path.join(process.cwd(), "public", row.file_path);
    try { fs.unlinkSync(fullPath); } catch {}
  }

  await pool.query("DELETE FROM design_orders WHERE id = ?", [Number(id)]);
  return NextResponse.json({ success: true });
}
