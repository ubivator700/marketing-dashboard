import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite } from "@/lib/api-helpers";

interface AttachmentRow extends RowDataPacket {
  id: number;
  reel_id: number;
  file_path: string;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "content-reel-attachments");
  if (writeError) return writeError;

  const { attachmentId } = await params;

  const [rows] = await pool.query<AttachmentRow[]>(
    "SELECT id, reel_id, file_path FROM content_reel_attachments WHERE id = ?",
    [attachmentId]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const att = rows[0];

  // Удаляем файл с диска (best-effort)
  try {
    const fullPath = path.join(process.cwd(), "public", att.file_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (err) {
    console.warn("[content-reel-attachments/DELETE] file unlink failed:", err);
  }

  await pool.query("DELETE FROM content_reel_attachments WHERE id = ?", [attachmentId]);
  return NextResponse.json({ ok: true });
}
