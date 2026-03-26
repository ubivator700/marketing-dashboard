import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite } from "@/lib/api-helpers";

interface StandaloneTaskRow extends RowDataPacket {
  id: number;
  name: string;
  description: string | null;
  assignee: string;
  deadline: string;
  due_time: string | null;
  duration: number | null;
  status: "todo" | "in_progress" | "done";
  channel_id: number | null;
}

function rowToStandaloneTask(row: StandaloneTaskRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    assignee: row.assignee,
    deadline: row.deadline,
    dueTime: row.due_time ?? undefined,
    duration: row.duration ?? undefined,
    status: row.status,
    channelId: row.channel_id,
  };
}

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const [rows] = await pool.query<StandaloneTaskRow[]>(
    "SELECT * FROM standalone_tasks ORDER BY deadline, id"
  );
  return NextResponse.json(rows.map(rowToStandaloneTask));
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "standalone-tasks");
  if (writeError) return writeError;

  const body = await request.json();

  try {
    let insertId: number;
    // Validate deadline is a proper date string
    const deadline = body.deadline && body.deadline !== "" ? body.deadline : new Date().toISOString().slice(0, 10);

    if (body.id) {
      await pool.query<ResultSetHeader>(
        "INSERT INTO standalone_tasks (id, name, description, assignee, deadline, due_time, duration, status, channel_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          body.id,
          body.name ?? "",
          body.description ?? null,
          body.assignee ?? "",
          deadline,
          body.dueTime ?? null,
          body.duration ?? null,
          body.status ?? "todo",
          body.channelId ?? null,
        ]
      );
      insertId = body.id;
    } else {
      const [result] = await pool.query<ResultSetHeader>(
        "INSERT INTO standalone_tasks (name, description, assignee, deadline, due_time, duration, status, channel_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          body.name ?? "",
          body.description ?? null,
          body.assignee ?? "",
          deadline,
          body.dueTime ?? null,
          body.duration ?? null,
          body.status ?? "todo",
          body.channelId ?? null,
        ]
      );
      insertId = result.insertId;
    }

    return NextResponse.json({ ...body, id: insertId }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/standalone-tasks error:", message, "body:", JSON.stringify(body));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
