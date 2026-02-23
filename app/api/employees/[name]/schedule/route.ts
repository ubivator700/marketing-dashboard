import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "employees");
  if (writeError) return writeError;

  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);

  const body = await request.json();
  const { schedule } = body as {
    schedule: { date: string; type: "work" | "dayoff" | "vacation" }[];
  };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      "DELETE FROM employee_schedule WHERE employee_name=?",
      [name]
    );

    for (const entry of schedule) {
      await conn.query(
        "INSERT INTO employee_schedule (employee_name, date, type) VALUES (?, ?, ?)",
        [name, entry.date, entry.type]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return NextResponse.json({ ok: true });
}
