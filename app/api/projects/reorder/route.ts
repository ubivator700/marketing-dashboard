import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

export async function PUT(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "projects");
  if (writeError) return writeError;

  const body = await request.json();
  const { orderedIds } = body as { orderedIds: number[] };

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    for (let i = 0; i < orderedIds.length; i++) {
      await conn.execute("UPDATE projects SET priority = ? WHERE id = ?", [i + 1, orderedIds[i]]);
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return NextResponse.json({ ok: true });
}
