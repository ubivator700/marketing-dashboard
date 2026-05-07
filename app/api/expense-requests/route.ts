import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, formatDate } from "@/lib/api-helpers";

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

// GET — admin видит все, employee только свои (по responsible == employeeName)
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const isAdmin = session!.role === "admin";
  let rows: RequestRow[];
  if (isAdmin) {
    [rows] = await pool.query<RequestRow[]>(
      "SELECT * FROM expense_requests ORDER BY created_at DESC"
    );
  } else {
    if (!session!.employeeName) return NextResponse.json([]);
    [rows] = await pool.query<RequestRow[]>(
      "SELECT * FROM expense_requests WHERE responsible = ? ORDER BY created_at DESC",
      [session!.employeeName]
    );
  }

  return NextResponse.json(rows.map(rowToObj));
}

// POST — сотрудник создаёт заявку (responsible = его employeeName)
export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { name, amount, date, projectId, channelId, storeId } = body;

  if (!session!.employeeName && session!.role !== "admin") {
    return NextResponse.json(
      { error: "Учётка не привязана к сотруднику — обратитесь к админу" },
      { status: 400 }
    );
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
  }
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Сумма должна быть больше 0" }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json({ error: "Дата обязательна" }, { status: 400 });
  }

  const responsible = session!.employeeName ?? session!.username;

  const [result] = await pool.query(
    "INSERT INTO expense_requests (name, amount, responsible, date, project_id, channel_id, store_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')",
    [name.trim(), amount, responsible, date, projectId ?? null, channelId ?? null, storeId ?? null]
  );
  const id = (result as { insertId: number }).insertId;

  const [rows] = await pool.query<RequestRow[]>(
    "SELECT * FROM expense_requests WHERE id = ?",
    [id]
  );
  return NextResponse.json(rowToObj(rows[0]), { status: 201 });
}
