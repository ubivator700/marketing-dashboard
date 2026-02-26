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

interface LptRow extends RowDataPacket {
  lead_id: number;
  product_type_id: number;
}

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [[rows], [lptRows]] = await Promise.all([
    pool.query<LeadRow[]>("SELECT * FROM leads ORDER BY date DESC"),
    pool.query<LptRow[]>("SELECT lead_id, product_type_id FROM lead_product_types"),
  ]);

  // Build lead_id → product_type_ids map
  const lptMap = new Map<number, number[]>();
  for (const r of lptRows) {
    const arr = lptMap.get(r.lead_id);
    if (arr) arr.push(r.product_type_id);
    else lptMap.set(r.lead_id, [r.product_type_id]);
  }

  const leads = rows.map((r) => ({
    id: r.id,
    name: r.name,
    channelId: r.channel_id ?? 0,
    contactMethod: r.contact_method,
    result: r.result,
    date: formatDate(r.date),
    note: r.note,
    storeId: r.store_id ?? null,
    productTypeIds: lptMap.get(r.id) ?? [],
  }));

  return NextResponse.json(leads);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "leads");
  if (writeError) return writeError;

  const body = await request.json();
  const { id, name, channelId, contactMethod, result, date, note, storeId, productTypeIds } = body;

  // channelId=0 means "unknown channel" — store as NULL in DB
  const dbChannelId = channelId === 0 ? null : channelId;
  const ptIds: number[] = Array.isArray(productTypeIds) ? productTypeIds : [];

  let insertId: number;
  if (id) {
    await pool.query(
      `INSERT INTO leads (id, name, channel_id, contact_method, result, date, note, store_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         channel_id = VALUES(channel_id),
         contact_method = VALUES(contact_method),
         result = VALUES(result),
         date = VALUES(date),
         note = VALUES(note),
         store_id = VALUES(store_id)`,
      [id, name, dbChannelId, contactMethod, result, date, note ?? null, storeId ?? null]
    );
    insertId = id;
  } else {
    const [queryResult] = await pool.query(
      "INSERT INTO leads (name, channel_id, contact_method, result, date, note, store_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, dbChannelId, contactMethod, result, date, note ?? null, storeId ?? null]
    );
    insertId = (queryResult as { insertId: number }).insertId;
  }

  // Upsert junction rows: clear old, insert new
  if (id) {
    await pool.query("DELETE FROM lead_product_types WHERE lead_id = ?", [insertId]);
  }
  if (ptIds.length > 0) {
    const values = ptIds.map((ptId) => [insertId, ptId]);
    await pool.query(
      "INSERT INTO lead_product_types (lead_id, product_type_id) VALUES ?",
      [values]
    );
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
      storeId: storeId ?? null,
      productTypeIds: ptIds,
    },
    { status: 201 }
  );
}
