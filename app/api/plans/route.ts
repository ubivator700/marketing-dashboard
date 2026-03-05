import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [planRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM plans ORDER BY sort_order, id"
  );
  const [itemRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM plan_items ORDER BY sort_order, id"
  );

  const itemsByPlan = new Map<number, any[]>();
  for (const i of itemRows) {
    const item = {
      id: i.id,
      name: i.name,
      result: i.result,
      startDate: formatDate(i.start_date),
      deadline: formatDate(i.deadline),
      responsible: i.responsible,
      color: i.color,
      sortOrder: i.sort_order,
      planId: i.plan_id,
    };
    if (!itemsByPlan.has(i.plan_id)) itemsByPlan.set(i.plan_id, []);
    itemsByPlan.get(i.plan_id)!.push(item);
  }

  const plans = planRows.map((p) => ({
    id: p.id,
    name: p.name,
    startDate: formatDate(p.start_date),
    deadline: formatDate(p.deadline),
    sortOrder: p.sort_order,
    items: itemsByPlan.get(p.id) || [],
  }));

  return NextResponse.json(plans);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const writeError = requireWrite(session!.role, "projects");
  if (writeError) return writeError;

  const body = await request.json();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    let planId: number;
    if (body.id) {
      await conn.execute(
        "INSERT INTO plans (id, name, start_date, deadline, sort_order) VALUES (?, ?, ?, ?, ?)",
        [body.id, body.name, body.startDate || null, body.deadline, body.sortOrder ?? 0]
      );
      planId = body.id;
    } else {
      const [result] = await conn.execute(
        "INSERT INTO plans (name, start_date, deadline, sort_order) VALUES (?, ?, ?, ?)",
        [body.name, body.startDate || null, body.deadline, body.sortOrder ?? 0]
      );
      planId = (result as any).insertId;
    }

    const items: any[] = [];

    for (const item of body.items || []) {
      let itemId: number;
      if (item.id) {
        await conn.execute(
          "INSERT INTO plan_items (id, name, result, start_date, deadline, responsible, color, sort_order, plan_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [item.id, item.name, item.result ?? "", item.startDate || null, item.deadline, item.responsible ?? "", item.color ?? "blue", item.sortOrder ?? 0, planId]
        );
        itemId = item.id;
      } else {
        const [itemResult] = await conn.execute(
          "INSERT INTO plan_items (name, result, start_date, deadline, responsible, color, sort_order, plan_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [item.name, item.result ?? "", item.startDate || null, item.deadline, item.responsible ?? "", item.color ?? "blue", item.sortOrder ?? 0, planId]
        );
        itemId = (itemResult as any).insertId;
      }

      items.push({
        id: itemId,
        name: item.name,
        result: item.result ?? "",
        startDate: item.startDate || null,
        deadline: item.deadline,
        responsible: item.responsible ?? "",
        color: item.color ?? "blue",
        sortOrder: item.sortOrder ?? 0,
        planId,
      });
    }

    await conn.commit();

    return NextResponse.json({
      id: planId,
      name: body.name,
      startDate: body.startDate || null,
      deadline: body.deadline,
      sortOrder: body.sortOrder ?? 0,
      items,
    }, { status: 201 });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
