import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

interface ExpenseRow extends RowDataPacket {
  id: number;
  name: string;
  amount: number;
  responsible: string;
  date: Date;
  project_id: number | null;
  channel_id: number | null;
}

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [rows] = await pool.query<ExpenseRow[]>(
    "SELECT * FROM expenses ORDER BY date DESC"
  );

  const expenses = rows.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
    responsible: r.responsible,
    date: formatDate(r.date),
    projectId: r.project_id,
    channelId: r.channel_id,
  }));

  return NextResponse.json(expenses);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "expenses");
  if (writeError) return writeError;

  const body = await request.json();
  const { id, name, amount, responsible, date, projectId, channelId } = body;

  let insertId: number;
  if (id) {
    await pool.query(
      "INSERT INTO expenses (id, name, amount, responsible, date, project_id, channel_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, name, amount, responsible, date, projectId ?? null, channelId ?? null]
    );
    insertId = id;
  } else {
    const [result] = await pool.query(
      "INSERT INTO expenses (name, amount, responsible, date, project_id, channel_id) VALUES (?, ?, ?, ?, ?, ?)",
      [name, amount, responsible, date, projectId ?? null, channelId ?? null]
    );
    insertId = (result as { insertId: number }).insertId;
  }

  return NextResponse.json(
    {
      id: insertId,
      name,
      amount,
      responsible,
      date,
      projectId: projectId ?? null,
      channelId: channelId ?? null,
    },
    { status: 201 }
  );
}
