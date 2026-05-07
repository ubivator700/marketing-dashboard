import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireAdmin, formatDate } from "@/lib/api-helpers";

interface RequestRow extends RowDataPacket {
  id: number;
  name: string;
  amount: number;
  responsible: string;
  date: Date;
  project_id: number | null;
  channel_id: number | null;
  store_id: number | null;
  status: "pending" | "approved" | "rejected";
  created_at: Date;
  decided_by: string | null;
  decided_at: Date | null;
  comment: string | null;
  expense_id: number | null;
}

function rowToObj(r: RequestRow) {
  return {
    id: r.id,
    name: r.name,
    amount: r.amount,
    responsible: r.responsible,
    date: formatDate(r.date),
    projectId: r.project_id,
    channelId: r.channel_id,
    storeId: r.store_id,
    status: r.status,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    decidedBy: r.decided_by,
    decidedAt: r.decided_at instanceof Date ? r.decided_at.toISOString() : (r.decided_at ? String(r.decided_at) : null),
    comment: r.comment,
    expenseId: r.expense_id,
  };
}

// PUT — admin одобряет/отклоняет; при approve создаётся запись в expenses транзакционно
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const adminError = requireAdmin(session!.role);
  if (adminError) return adminError;

  const { id } = await params;
  const body = await request.json();
  const { status, comment } = body as { status: "approved" | "rejected"; comment?: string };

  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query<RequestRow[]>(
      "SELECT * FROM expense_requests WHERE id = ? FOR UPDATE",
      [id]
    );
    if (rows.length === 0) {
      await conn.rollback();
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const req = rows[0];
    if (req.status !== "pending") {
      await conn.rollback();
      return NextResponse.json({ error: "Заявка уже обработана" }, { status: 400 });
    }

    let expenseId: number | null = null;
    if (status === "approved") {
      const [insRes] = await conn.query(
        "INSERT INTO expenses (name, amount, responsible, date, project_id, channel_id, store_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [req.name, req.amount, req.responsible, req.date, req.project_id, req.channel_id, req.store_id]
      );
      expenseId = (insRes as { insertId: number }).insertId;
    }

    await conn.query(
      "UPDATE expense_requests SET status = ?, decided_by = ?, decided_at = NOW(), comment = ?, expense_id = ? WHERE id = ?",
      [status, session!.username, comment ?? null, expenseId, id]
    );

    await conn.commit();

    const [updated] = await conn.query<RequestRow[]>(
      "SELECT * FROM expense_requests WHERE id = ?",
      [id]
    );
    return NextResponse.json(rowToObj(updated[0]));
  } catch (err) {
    await conn.rollback();
    console.error("[expense-requests/PUT]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  } finally {
    conn.release();
  }
}

// DELETE — автор может удалить свою pending-заявку, admin любую
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const isAdmin = session!.role === "admin";

  if (!isAdmin) {
    const [rows] = await pool.query<RequestRow[]>(
      "SELECT responsible, status FROM expense_requests WHERE id = ?",
      [id]
    );
    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (rows[0].responsible !== session!.employeeName) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (rows[0].status !== "pending") {
      return NextResponse.json({ error: "Можно удалить только pending" }, { status: 400 });
    }
  }

  await pool.query("DELETE FROM expense_requests WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
