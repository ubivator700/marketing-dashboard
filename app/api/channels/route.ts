import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [channelRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM channels ORDER BY id"
  );
  const [taskRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM channel_tasks ORDER BY id"
  );

  const tasksByChannel = new Map<number, any[]>();
  for (const t of taskRows) {
    const task = {
      id: t.id,
      text: t.text,
      done: Boolean(t.done),
      deadline: formatDate(t.deadline) ?? undefined,
    };
    if (!tasksByChannel.has(t.channel_id)) tasksByChannel.set(t.channel_id, []);
    tasksByChannel.get(t.channel_id)!.push(task);
  }

  const channels = channelRows.map((c) => ({
    id: c.id,
    name: c.name,
    group: c.group,
    tasks: tasksByChannel.get(c.id) || [],
  }));

  return NextResponse.json(channels);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "channels");
  if (writeError) return writeError;

  const body = await request.json();

  await pool.query(
    "INSERT INTO channels (id, name, `group`) VALUES (?, ?, ?)",
    [body.id, body.name, body.group]
  );

  const channel = {
    id: body.id,
    name: body.name,
    group: body.group,
    tasks: [],
  };

  return NextResponse.json(channel, { status: 201 });
}
