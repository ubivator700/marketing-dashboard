import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

interface LeadRow extends RowDataPacket {
  id: number;
  name: string;
  channel_id: number;
  contact_method: string;
  result: string;
  date: Date;
  note: string | null;
}

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [rows] = await pool.query<LeadRow[]>(
    "SELECT * FROM leads ORDER BY date DESC"
  );

  const leads = rows.map((r) => ({
    id: r.id,
    name: r.name,
    channelId: r.channel_id,
    contactMethod: r.contact_method,
    result: r.result,
    date: formatDate(r.date),
    note: r.note,
  }));

  return NextResponse.json(leads);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "leads");
  if (writeError) return writeError;

  const body = await request.json();
  const { id, name, channelId, contactMethod, result, date, note } = body;

  let insertId: number;
  if (id) {
    await pool.query(
      "INSERT INTO leads (id, name, channel_id, contact_method, result, date, note) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, name, channelId, contactMethod, result, date, note ?? null]
    );
    insertId = id;
  } else {
    const [queryResult] = await pool.query(
      "INSERT INTO leads (name, channel_id, contact_method, result, date, note) VALUES (?, ?, ?, ?, ?, ?)",
      [name, channelId, contactMethod, result, date, note ?? null]
    );
    insertId = (queryResult as { insertId: number }).insertId;
  }

  return NextResponse.json(
    {
      id: insertId,
      name,
      channelId,
      contactMethod,
      result,
      date,
      note: note ?? null,
    },
    { status: 201 }
  );
}
