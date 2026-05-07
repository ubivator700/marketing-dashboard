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

interface TaskCountRow extends RowDataPacket {
  stage_id: number;
  total: number;
  done: number;
}

// GET — все контент-планы со вложенными роликами и аттачментами
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [projectRows] = await pool.query<ContentProjectRow[]>(
    "SELECT * FROM content_projects ORDER BY priority ASC, deadline ASC"
  );
  const [reelRows] = await pool.query<ContentReelRow[]>(
    "SELECT * FROM content_reels ORDER BY priority ASC, deadline ASC"
  );
  const [attachRows] = await pool.query<AttachmentRow[]>(
    "SELECT * FROM content_reel_attachments ORDER BY created_at ASC"
  );

  // Подсчёт задач по каждому shadow_stage_id
  const shadowStageIds = reelRows.map((r) => r.shadow_stage_id).filter((x): x is number => x !== null);
  const taskCounts = new Map<number, { total: number; done: number }>();
  if (shadowStageIds.length > 0) {
    const placeholders = shadowStageIds.map(() => "?").join(",");
    const [counts] = await pool.query<TaskCountRow[]>(
      `SELECT stage_id, COUNT(*) AS total, SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) AS done
       FROM project_tasks WHERE stage_id IN (${placeholders}) AND cancelled = 0 GROUP BY stage_id`,
      shadowStageIds
    );
    for (const c of counts) {
      taskCounts.set(c.stage_id, { total: Number(c.total), done: Number(c.done) });
    }
  }

  const attachByReel = new Map<number, AttachmentRow[]>();
  for (const a of attachRows) {
    const arr = attachByReel.get(a.reel_id) ?? [];
    arr.push(a);
    attachByReel.set(a.reel_id, arr);
  }

  const reelsByProject = new Map<number, ContentReelRow[]>();
  for (const r of reelRows) {
    const arr = reelsByProject.get(r.content_project_id) ?? [];
    arr.push(r);
    reelsByProject.set(r.content_project_id, arr);
  }

  const result = projectRows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    startDate: formatDate(p.start_date),
    deadline: formatDate(p.deadline),
    responsible: p.responsible,
    priority: p.priority,
    cancelled: !!p.cancelled,
    shadowProjectId: p.shadow_project_id,
    createdAt: p.created_at instanceof Date ? p.created_at.toISOString() : String(p.created_at),
    reels: (reelsByProject.get(p.id) ?? []).map((r) => {
      const counts = r.shadow_stage_id ? taskCounts.get(r.shadow_stage_id) : null;
      return {
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
        attachments: (attachByReel.get(r.id) ?? []).map((a) => ({
          id: a.id,
          reelId: a.reel_id,
          fileName: a.file_name,
          filePath: a.file_path,
          fileType: a.file_type,
          fileSize: a.file_size,
          kind: a.kind,
          createdAt: a.created_at instanceof Date ? a.created_at.toISOString() : String(a.created_at),
        })),
        taskCount: counts?.total ?? 0,
        doneTaskCount: counts?.done ?? 0,
      };
    }),
  }));

  return NextResponse.json(result);
}

// POST — создаёт контент-план + автоматически теневой Project (kind='content')
export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "content-projects");
  if (writeError) return writeError;

  const body = await request.json();
  const { name, description, startDate, deadline, responsible, priority } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
  }
  if (!deadline) {
    return NextResponse.json({ error: "Дедлайн обязателен" }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Теневой Project (kind='content')
    const [projRes] = await conn.query(
      "INSERT INTO projects (name, goal, description, start_date, deadline, priority, responsible, plan_item_id, kind) VALUES (?, '', ?, ?, ?, ?, ?, NULL, 'content')",
      [name.trim(), description ?? "", startDate ?? null, deadline, priority ?? 0, responsible ?? null]
    );
    const shadowProjectId = (projRes as { insertId: number }).insertId;

    // 2. Сам контент-план
    const [cpRes] = await conn.query(
      "INSERT INTO content_projects (name, description, start_date, deadline, responsible, priority, shadow_project_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name.trim(), description ?? "", startDate ?? null, deadline, responsible ?? null, priority ?? 0, shadowProjectId]
    );
    const id = (cpRes as { insertId: number }).insertId;

    await conn.commit();

    const [rows] = await conn.query<ContentProjectRow[]>(
      "SELECT * FROM content_projects WHERE id = ?",
      [id]
    );
    const p = rows[0];
    return NextResponse.json(
      {
        id: p.id,
        name: p.name,
        description: p.description ?? "",
        startDate: formatDate(p.start_date),
        deadline: formatDate(p.deadline),
        responsible: p.responsible,
        priority: p.priority,
        cancelled: false,
        shadowProjectId: p.shadow_project_id,
        reels: [],
        createdAt: p.created_at instanceof Date ? p.created_at.toISOString() : String(p.created_at),
      },
      { status: 201 }
    );
  } catch (err) {
    await conn.rollback();
    console.error("[content-projects/POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
