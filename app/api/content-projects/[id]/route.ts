import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

interface ContentProjectRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  start_date: Date | null;
  deadline: Date;
  responsible: string | null;
  priority: number;
  cancelled: number;
  shadow_project_id: number | null;
  created_at: Date;
}

// PUT — обновляет контент-план + синхронизирует поля теневого Project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "content-projects");
  if (writeError) return writeError;

  const { id } = await params;
  const body = await request.json();
  const { name, description, startDate, deadline, responsible, priority, cancelled } = body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      "UPDATE content_projects SET name = ?, description = ?, start_date = ?, deadline = ?, responsible = ?, priority = ?, cancelled = ? WHERE id = ?",
      [name, description ?? "", startDate ?? null, deadline, responsible ?? null, priority ?? 0, cancelled ? 1 : 0, id]
    );

    // Синхронизируем теневой project
    const [rows] = await conn.query<ContentProjectRow[]>(
      "SELECT shadow_project_id FROM content_projects WHERE id = ?",
      [id]
    );
    const shadow = rows[0]?.shadow_project_id;
    if (shadow) {
      await conn.query(
        "UPDATE projects SET name = ?, description = ?, start_date = ?, deadline = ?, priority = ?, responsible = ?, cancelled = ? WHERE id = ?",
        [name, description ?? "", startDate ?? null, deadline, priority ?? 0, responsible ?? null, cancelled ? 1 : 0, shadow]
      );
    }

    await conn.commit();

    const [updated] = await conn.query<ContentProjectRow[]>(
      "SELECT * FROM content_projects WHERE id = ?",
      [id]
    );
    if (updated.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const p = updated[0];
    return NextResponse.json({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      startDate: formatDate(p.start_date),
      deadline: formatDate(p.deadline),
      responsible: p.responsible,
      priority: p.priority,
      cancelled: !!p.cancelled,
      shadowProjectId: p.shadow_project_id,
    });
  } catch (err) {
    await conn.rollback();
    console.error("[content-projects/PUT]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  } finally {
    conn.release();
  }
}

// DELETE — удаляет контент-план + теневой project (всё каскадно подчищается)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "content-projects");
  if (writeError) return writeError;

  const { id } = await params;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query<ContentProjectRow[]>(
      "SELECT shadow_project_id FROM content_projects WHERE id = ?",
      [id]
    );
    const shadow = rows[0]?.shadow_project_id;

    // Удаляем content_project (cascade на content_reels и content_reel_attachments)
    await conn.query("DELETE FROM content_projects WHERE id = ?", [id]);
    // Удаляем теневой project (cascade на stages → project_tasks)
    if (shadow) {
      await conn.query("DELETE FROM projects WHERE id = ?", [shadow]);
    }

    await conn.commit();
    return NextResponse.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error("[content-projects/DELETE]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
