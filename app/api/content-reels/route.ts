import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

interface ContentReelRow extends RowDataPacket {
  id: number;
  content_project_id: number;
  name: string;
  description: string | null;
  start_date: Date | null;
  deadline: Date | null;
  priority: number;
  status: "idea" | "in_progress" | "review" | "published" | "cancelled";
  cancelled: number;
  shadow_stage_id: number | null;
  created_at: Date;
}

interface ContentProjectRow extends RowDataPacket {
  id: number;
  shadow_project_id: number | null;
  deadline: Date;
}

// POST — создаёт ролик + автоматически теневой Stage в shadow project контент-плана
export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "content-reels");
  if (writeError) return writeError;

  const body = await request.json();
  const { contentProjectId, name, description, startDate, deadline, priority, status } = body;

  if (!contentProjectId) {
    return NextResponse.json({ error: "contentProjectId обязателен" }, { status: 400 });
  }
  if (!name?.trim()) {
    return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Найдём shadow project
    const [cpRows] = await conn.query<ContentProjectRow[]>(
      "SELECT id, shadow_project_id, deadline FROM content_projects WHERE id = ?",
      [contentProjectId]
    );
    if (cpRows.length === 0) {
      await conn.rollback();
      return NextResponse.json({ error: "Контент-план не найден" }, { status: 404 });
    }
    const shadowProjectId = cpRows[0].shadow_project_id;
    if (!shadowProjectId) {
      await conn.rollback();
      return NextResponse.json({ error: "У контент-плана нет shadow project" }, { status: 500 });
    }

    // 1. Создаём теневой Stage
    const stageDeadline = deadline ?? cpRows[0].deadline;
    const [stageRes] = await conn.query(
      "INSERT INTO stages (name, result, description, start_date, deadline, project_id, priority) VALUES (?, '', ?, ?, ?, ?, ?)",
      [name.trim(), description ?? "", startDate ?? null, stageDeadline, shadowProjectId, priority ?? 0]
    );
    const shadowStageId = (stageRes as { insertId: number }).insertId;

    // 2. Создаём сам reel
    const [reelRes] = await conn.query(
      "INSERT INTO content_reels (content_project_id, name, description, start_date, deadline, priority, status, shadow_stage_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [contentProjectId, name.trim(), description ?? "", startDate ?? null, deadline ?? null, priority ?? 0, status ?? "idea", shadowStageId]
    );
    const id = (reelRes as { insertId: number }).insertId;

    await conn.commit();

    const [rows] = await conn.query<ContentReelRow[]>(
      "SELECT * FROM content_reels WHERE id = ?",
      [id]
    );
    const r = rows[0];
    return NextResponse.json(
      {
        id: r.id,
        contentProjectId: r.content_project_id,
        name: r.name,
        description: r.description ?? "",
        startDate: formatDate(r.start_date),
        deadline: formatDate(r.deadline),
        priority: r.priority,
        status: r.status,
        cancelled: !!r.cancelled,
        shadowStageId: r.shadow_stage_id,
        attachments: [],
        taskCount: 0,
        doneTaskCount: 0,
      },
      { status: 201 }
    );
  } catch (err) {
    await conn.rollback();
    console.error("[content-reels/POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
