import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth } from "@/lib/api-helpers";

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

// GET — admin видит все, employee только свои
export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const isAdmin = session!.role === "admin";
  let rows: RequestRow[];
  if (isAdmin) {
    [rows] = await pool.query<RequestRow[]>(
      "SELECT * FROM advance_requests ORDER BY created_at DESC"
    );
  } else {
    if (!session!.employeeName) return NextResponse.json([]);
    [rows] = await pool.query<RequestRow[]>(
      "SELECT * FROM advance_requests WHERE employee_name = ? ORDER BY created_at DESC",
      [session!.employeeName]
    );
  }

  return NextResponse.json(rows.map(rowToObj));
}

// POST — сотрудник создаёт заявку на свой employeeName
export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { amount, reason } = body as { amount: number; reason: string };

  if (!session!.employeeName) {
    return NextResponse.json(
      { error: "Учётка не привязана к сотруднику — обратитесь к админу" },
      { status: 400 }
    );
  }

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Сумма должна быть больше 0" }, { status: 400 });
  }

  const [result] = await pool.query(
    "INSERT INTO advance_requests (employee_name, amount, reason, status) VALUES (?, ?, ?, 'pending')",
    [session!.employeeName, amount, reason ?? ""]
  );
  const id = (result as { insertId: number }).insertId;

  const [rows] = await pool.query<RequestRow[]>(
    "SELECT * FROM advance_requests WHERE id = ?",
    [id]
  );
  return NextResponse.json(rowToObj(rows[0]), { status: 201 });
}
