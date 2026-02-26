import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite } from "@/lib/api-helpers";

interface RecurringTaskRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  assignee: string;
  recurrence_type: "daily" | "weekly" | "monthly";
  recurrence_interval: number;
  recurrence_days: string | null;
  channel_id: number | null;
  due_time: string | null;
  duration: number | null;
  status: "active" | "paused";
}

function rowToRecurringTask(row: RecurringTaskRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    assignee: row.assignee,
    recurrenceType: row.recurrence_type,
    recurrenceInterval: row.recurrence_interval,
    recurrenceDays: row.recurrence_days ?? "",
    channelId: row.channel_id,
    dueTime: row.due_time ?? undefined,
    duration: row.duration ?? undefined,
    status: row.status,
  };
}

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const [rows] = await pool.query<RecurringTaskRow[]>(
    "SELECT * FROM recurring_tasks ORDER BY id"
  );
  return NextResponse.json(rows.map(rowToRecurringTask));
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "recurring-tasks");
  if (writeError) return writeError;

  const body = await request.json();

  let insertId: number;
  if (body.id) {
    await pool.query<ResultSetHeader>(
      "INSERT INTO recurring_tasks (id, name, description, assignee, recurrence_type, recurrence_interval, recurrence_days, channel_id, due_time, duration, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        body.id,
        body.name,
        body.description ?? null,
        body.assignee ?? "",
        body.recurrenceType ?? "daily",
        body.recurrenceInterval ?? 1,
        body.recurrenceDays ?? null,
        body.channelId ?? null,
        body.dueTime ?? null,
        body.duration ?? null,
        body.status ?? "active",
      ]
    );
    insertId = body.id;
  } else {
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO recurring_tasks (name, description, assignee, recurrence_type, recurrence_interval, recurrence_days, channel_id, due_time, duration, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        body.name,
        body.description ?? null,
        body.assignee ?? "",
        body.recurrenceType ?? "daily",
        body.recurrenceInterval ?? 1,
        body.recurrenceDays ?? null,
        body.channelId ?? null,
        body.dueTime ?? null,
        body.duration ?? null,
        body.status ?? "active",
      ]
    );
    insertId = result.insertId;
  }

  return NextResponse.json({ ...body, id: insertId }, { status: 201 });
}
