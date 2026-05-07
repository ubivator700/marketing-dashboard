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
}

// PUT — обновляет ролик + синхронизирует поля теневого stage
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "content-reels");
  if (writeError) return writeError;

  const { id } = await params;
  const body = await request.json();
  const { name, description, startDate, deadline, priority, status, cancelled } = body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      "UPDATE content_reels SET name = ?, description = ?, start_date = ?, deadline = ?, priority = ?, status = ?, cancelled = ? WHERE id = ?",
      [name, description ?? "", startDate ?? null, deadline ?? null, priority ?? 0, status ?? "idea", cancelled ? 1 : 0, id]
    );

    // Синхронизируем теневой stage
    const [rows] = await conn.query<ContentReelRow[]>(
      "SELECT shadow_stage_id, deadline FROM content_reels WHERE id = ?",
      [id]
    );
    const shadowStageId = rows[0]?.shadow_stage_id;
    if (shadowStageId) {
      const stageDeadline = deadline ?? rows[0].deadline;
      await conn.query(
        "UPDATE stages SET name = ?, description = ?, start_date = ?, deadline = ?, priority = ?, cancelled = ? WHERE id = ?",
        [name, description ?? "", startDate ?? null, stageDeadline, priority ?? 0, cancelled ? 1 : 0, shadowStageId]
      );
    }

    await conn.commit();

    const [updated] = await conn.query<ContentReelRow[]>(
      "SELECT * FROM content_reels WHERE id = ?",
      [id]
    );
    if (updated.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const r = updated[0];
    return NextResponse.json({
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
    });
  } catch (err) {
    await conn.rollback();
    console.error("[content-reels/PUT]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  } finally {
    conn.release();
  }
}

// DELETE — удаляет ролик + теневой stage (cascade на project_tasks)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "content-reels");
  if (writeError) return writeError;

  const { id } = await params;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query<ContentReelRow[]>(
      "SELECT shadow_stage_id FROM content_reels WHERE id = ?",
      [id]
    );
    const shadowStageId = rows[0]?.shadow_stage_id;

    await conn.query("DELETE FROM content_reels WHERE id = ?", [id]);
    if (shadowStageId) {
      await conn.query("DELETE FROM stages WHERE id = ?", [shadowStageId]);
    }

    await conn.commit();
    return NextResponse.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error("[content-reels/DELETE]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
