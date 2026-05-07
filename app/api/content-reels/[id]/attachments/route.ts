import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite } from "@/lib/api-helpers";

interface AttachmentRow extends RowDataPacket {
  id: number;
  reel_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  kind: "reference" | "document";
  created_at: Date;
}

// GET — список аттачментов ролика
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const [rows] = await pool.query<AttachmentRow[]>(
    "SELECT * FROM content_reel_attachments WHERE reel_id = ? ORDER BY created_at ASC",
    [id]
  );

  return NextResponse.json(
    rows.map((a) => ({
      id: a.id,
      reelId: a.reel_id,
      fileName: a.file_name,
      filePath: a.file_path,
      fileType: a.file_type,
      fileSize: a.file_size,
      kind: a.kind,
      createdAt: a.created_at instanceof Date ? a.created_at.toISOString() : String(a.created_at),
    }))
  );
}

// POST — multipart/form-data, поля: files[], kind ('reference' | 'document')
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "content-reel-attachments");
  if (writeError) return writeError;

  const { id } = await params;
  const reelId = Number(id);

  const formData = await request.formData();
  const kind = (formData.get("kind") as string) === "document" ? "document" : "reference";
  const files = formData.getAll("files") as File[];

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "content-reels");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const inserted: object[] = [];

  for (const file of files) {
    if (!file || !file.name) continue;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeName = `${reelId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const relPath = `/uploads/content-reels/${safeName}`;
    const fullPath = path.join(process.cwd(), "public", relPath);
    fs.writeFileSync(fullPath, buffer);

    const [res] = await pool.query<ResultSetHeader>(
      "INSERT INTO content_reel_attachments (reel_id, file_name, file_path, file_type, file_size, kind) VALUES (?, ?, ?, ?, ?, ?)",
      [reelId, file.name, relPath, file.type, file.size, kind]
    );

    inserted.push({
      id: res.insertId,
      reelId,
      fileName: file.name,
      filePath: relPath,
      fileType: file.type,
      fileSize: file.size,
      kind,
      createdAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ inserted }, { status: 201 });
}
