import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "channel_tasks");
  if (writeError) return writeError;

  const { id } = await params;
  const channelId = parseInt(id, 10);
  const body = await request.json();

  await pool.query(
    "INSERT INTO channel_tasks (id, text, done, deadline, channel_id) VALUES (?, ?, ?, ?, ?)",
    [body.id, body.text, body.done, body.deadline || null, channelId]
  );

  const task = {
    id: body.id,
    text: body.text,
    done: Boolean(body.done),
    deadline: body.deadline ?? undefined,
  };

  return NextResponse.json(task, { status: 201 });
}
