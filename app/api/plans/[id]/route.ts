import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

async function fetchPlan(planId: number) {
  const [planRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM plans WHERE id = ?",
    [planId]
  );
  if (planRows.length === 0) return null;

  const p = planRows[0];

  const [itemRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM plan_items WHERE plan_id = ? ORDER BY sort_order, id",
    [planId]
  );

  const items = itemRows.map((i) => ({
    id: i.id,
    name: i.name,
    result: i.result,
    startDate: formatDate(i.start_date),
    deadline: formatDate(i.deadline),
    responsible: i.responsible,
    color: i.color,
    sortOrder: i.sort_order,
    planId: i.plan_id,
    cancelled: !!i.cancelled,
  }));

  return {
    id: p.id,
    name: p.name,
    startDate: formatDate(p.start_date),
    deadline: formatDate(p.deadline),
    sortOrder: p.sort_order,
    cancelled: !!p.cancelled,
    items,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const planId = parseInt(id, 10);

  const plan = await fetchPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json(plan);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "projects");
  if (writeError) return writeError;

  const { id } = await params;
  const planId = parseInt(id, 10);
  const body = await request.json();

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Update plan metadata
    await conn.execute(
      "UPDATE plans SET name=?, start_date=?, deadline=?, sort_order=?, cancelled=? WHERE id=?",
      [body.name, body.startDate || null, body.deadline, body.sortOrder ?? 0, body.cancelled ? 1 : 0, planId]
    );

    // 2. Get existing item IDs
    const [existingItemRows] = await conn.execute<RowDataPacket[]>(
      "SELECT id FROM plan_items WHERE plan_id = ?",
      [planId]
    );
    const existingItemIds = new Set(existingItemRows.map((r) => r.id));
    const incomingItemIds = new Set(
      (body.items || []).filter((i: any) => i.id).map((i: any) => i.id)
    );

    // 3. Delete items no longer present
    for (const existingId of existingItemIds) {
      if (!incomingItemIds.has(existingId)) {
        // Before deleting, unlink any projects bound to this item
        await conn.execute(
          "UPDATE projects SET plan_item_id = NULL WHERE plan_item_id = ?",
          [existingId]
        );
        await conn.execute("DELETE FROM plan_items WHERE id = ? AND plan_id = ?", [existingId, planId]);
      }
    }

    // 4. Insert or update each item
    for (const item of body.items || []) {
      if (item.id && existingItemIds.has(item.id)) {
        // Update existing
        await conn.execute(
          "UPDATE plan_items SET name=?, result=?, start_date=?, deadline=?, responsible=?, color=?, sort_order=?, cancelled=? WHERE id=? AND plan_id=?",
          [item.name, item.result ?? "", item.startDate || null, item.deadline, item.responsible ?? "", item.color ?? "blue", item.sortOrder ?? 0, item.cancelled ? 1 : 0, item.id, planId]
        );
      } else if (item.id) {
        // Insert with client-provided ID
        await conn.execute(
          "INSERT INTO plan_items (id, name, result, start_date, deadline, responsible, color, sort_order, plan_id, cancelled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [item.id, item.name, item.result ?? "", item.startDate || null, item.deadline, item.responsible ?? "", item.color ?? "blue", item.sortOrder ?? 0, planId, item.cancelled ? 1 : 0]
        );
      } else {
        // Insert with auto-increment
        await conn.execute(
          "INSERT INTO plan_items (name, result, start_date, deadline, responsible, color, sort_order, plan_id, cancelled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [item.name, item.result ?? "", item.startDate || null, item.deadline, item.responsible ?? "", item.color ?? "blue", item.sortOrder ?? 0, planId, item.cancelled ? 1 : 0]
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const updated = await fetchPlan(planId);
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "projects");
  if (writeError) return writeError;

  const { id } = await params;
  const planId = parseInt(id, 10);

  // CASCADE deletes plan_items; projects get plan_item_id = NULL via FK ON DELETE SET NULL
  await pool.query("DELETE FROM plans WHERE id = ?", [planId]);

  return NextResponse.json({ ok: true });
}
