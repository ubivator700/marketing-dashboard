import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "channels");
  if (writeError) return writeError;

  const { id } = await params;
  const channelId = parseInt(id, 10);
  const body = await request.json();

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Update channel itself
    await conn.execute(
      "UPDATE channels SET name = ?, `group` = ? WHERE id = ?",
      [body.name, body.group, channelId]
    );

    // 2. Sync nested tasks if provided
    if (body.tasks !== undefined) {
      const [existingTaskRows] = await conn.execute<RowDataPacket[]>(
        "SELECT id FROM channel_tasks WHERE channel_id = ?",
        [channelId]
      );
      const existingTaskIds = new Set(existingTaskRows.map((r) => r.id));
      const incomingTasks: any[] = body.tasks || [];
      const incomingTaskIds = new Set(
        incomingTasks.filter((t: any) => t.id).map((t: any) => t.id)
      );

      // Delete removed tasks
      for (const existingId of existingTaskIds) {
        if (!incomingTaskIds.has(existingId)) {
          await conn.execute("DELETE FROM channel_tasks WHERE id = ?", [existingId]);
        }
      }

      // Insert or update tasks
      for (const task of incomingTasks) {
        if (task.id && existingTaskIds.has(task.id)) {
          await conn.execute(
            "UPDATE channel_tasks SET text = ?, done = ?, deadline = ? WHERE id = ?",
            [task.text, task.done ? 1 : 0, task.deadline || null, task.id]
          );
        } else if (task.id) {
          // New task with client-provided id
          await conn.execute(
            "INSERT INTO channel_tasks (id, text, done, deadline, channel_id) VALUES (?, ?, ?, ?, ?)",
            [task.id, task.text, task.done ? 1 : 0, task.deadline || null, channelId]
          );
        } else {
          // New task without id — auto-increment
          await conn.execute(
            "INSERT INTO channel_tasks (text, done, deadline, channel_id) VALUES (?, ?, ?, ?)",
            [task.text, task.done ? 1 : 0, task.deadline || null, channelId]
          );
        }
      }
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  // Fetch updated channel with tasks
  const [taskRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM channel_tasks WHERE channel_id = ? ORDER BY id",
    [channelId]
  );
  const tasks = taskRows.map((t) => ({
    id: t.id,
    text: t.text,
    done: Boolean(t.done),
    deadline: formatDate(t.deadline) ?? undefined,
  }));

  return NextResponse.json({ id: channelId, name: body.name, group: body.group, tasks });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "channels");
  if (writeError) return writeError;

  const { id } = await params;
  const channelId = parseInt(id, 10);

  await pool.query("DELETE FROM channels WHERE id = ?", [channelId]);

  return NextResponse.json({ ok: true });
}
