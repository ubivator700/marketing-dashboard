import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite } from "@/lib/api-helpers";

interface StoreRow extends RowDataPacket {
  id: number;
  name: string;
  tbu: number;
}

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const [rows] = await pool.query<StoreRow[]>("SELECT * FROM stores ORDER BY id");

  return NextResponse.json(rows.map((r) => ({ id: r.id, name: r.name, tbu: r.tbu ?? 0 })));
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "stores");
  if (writeError) return writeError;

  const body = await request.json();
  const { id, name, tbu } = body;
  const tbuVal = tbu ?? 0;

  let insertId: number;
  if (id) {
    await pool.query("INSERT INTO stores (id, name, tbu) VALUES (?, ?, ?)", [id, name, tbuVal]);
    insertId = id;
  } else {
    const [result] = await pool.query("INSERT INTO stores (name, tbu) VALUES (?, ?)", [name, tbuVal]);
    insertId = (result as { insertId: number }).insertId;
  }

  return NextResponse.json({ id: insertId, name, tbu: tbuVal }, { status: 201 });
}
