import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

interface IdeaRow extends RowDataPacket {
  id: number;
  title: string;
  description: string;
  status: string;
  date: Date;
}

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const [rows] = await pool.query<IdeaRow[]>(
    "SELECT * FROM ideas ORDER BY date DESC"
  );

  const ideas = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    date: formatDate(r.date),
  }));

  return NextResponse.json(ideas);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "ideas");
  if (writeError) return writeError;

  const body = await request.json();
  const { id, title, description, status, date } = body;

  let insertId: number;
  if (id) {
    await pool.query(
      "INSERT INTO ideas (id, title, description, status, date) VALUES (?, ?, ?, ?, ?)",
      [id, title, description ?? "", status ?? "new", date]
    );
    insertId = id;
  } else {
    const [result] = await pool.query(
      "INSERT INTO ideas (title, description, status, date) VALUES (?, ?, ?, ?)",
      [title, description ?? "", status ?? "new", date]
    );
    insertId = (result as { insertId: number }).insertId;
  }

  return NextResponse.json(
    { id: insertId, title, description: description ?? "", status: status ?? "new", date },
    { status: 201 }
  );
}
