import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite } from "@/lib/api-helpers";

interface ProductTypeRow extends RowDataPacket {
  id: number;
  name: string;
  category: string;
  avg_check: number;
  avg_markup: number;
}

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const [rows] = await pool.query<ProductTypeRow[]>("SELECT * FROM product_types ORDER BY id");

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      avgCheck: r.avg_check,
      avgMarkup: r.avg_markup,
    }))
  );
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "product-types");
  if (writeError) return writeError;

  const body = await request.json();
  const { id, name, category, avgCheck, avgMarkup } = body;

  let insertId: number;
  if (id) {
    await pool.query(
      "INSERT INTO product_types (id, name, category, avg_check, avg_markup) VALUES (?, ?, ?, ?, ?)",
      [id, name, category ?? "other", avgCheck ?? 0, avgMarkup ?? 0]
    );
    insertId = id;
  } else {
    const [result] = await pool.query(
      "INSERT INTO product_types (name, category, avg_check, avg_markup) VALUES (?, ?, ?, ?)",
      [name, category ?? "other", avgCheck ?? 0, avgMarkup ?? 0]
    );
    insertId = (result as { insertId: number }).insertId;
  }

  return NextResponse.json(
    { id: insertId, name, category: category ?? "other", avgCheck: avgCheck ?? 0, avgMarkup: avgMarkup ?? 0 },
    { status: 201 }
  );
}
