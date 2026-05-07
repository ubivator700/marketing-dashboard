import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/api-helpers";

interface RequestRow extends RowDataPacket {
  id: number;
  employee_name: string;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: Date;
  decided_by: string | null;
  decided_at: Date | null;
  comment: string | null;
}

function rowToObj(r: RequestRow) {
  return {
    id: r.id,
    employeeName: r.employee_name,
    amount: r.amount,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    decidedBy: r.decided_by,
    decidedAt: r.decided_at instanceof Date ? r.decided_at.toISOString() : (r.decided_at ? String(r.decided_at) : null),
    comment: r.comment,
  };
}

// PUT — admin одобряет/отклоняет
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

  await pool.query(
    "UPDATE advance_requests SET status = ?, decided_by = ?, decided_at = NOW(), comment = ? WHERE id = ?",
    [status, session!.username, comment ?? null, id]
  );

  const [rows] = await pool.query<RequestRow[]>(
    "SELECT * FROM advance_requests WHERE id = ?",
    [id]
  );
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rowToObj(rows[0]));
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
      "SELECT employee_name, status FROM advance_requests WHERE id = ?",
      [id]
    );
    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (rows[0].employee_name !== session!.employeeName) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (rows[0].status !== "pending") {
      return NextResponse.json({ error: "Можно удалить только заявки в статусе pending" }, { status: 400 });
    }
  }

  await pool.query("DELETE FROM advance_requests WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
