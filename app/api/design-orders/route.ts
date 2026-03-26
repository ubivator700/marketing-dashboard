import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { formatDate } from "@/lib/api-helpers";

interface OrderRow extends RowDataPacket {
  id: number;
  title: string;
  description: string;
  author: string;
  status: "new" | "accepted" | "rejected";
  created_at: Date;
  accepted_by: string | null;
  task_id: number | null;
}

interface AttachmentRow extends RowDataPacket {
  id: number;
  order_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
}

// GET - requires auth (for dashboard)
export async function GET(request: NextRequest) {
  // Check auth via cookie - optional for this endpoint
  const [orderRows] = await pool.query<OrderRow[]>(
    "SELECT * FROM design_orders ORDER BY created_at DESC"
  );

  const [attachRows] = await pool.query<AttachmentRow[]>(
    "SELECT * FROM design_order_attachments"
  );

  const attachMap = new Map<number, AttachmentRow[]>();
  for (const a of attachRows) {
    const arr = attachMap.get(a.order_id) ?? [];
    arr.push(a);
    attachMap.set(a.order_id, arr);
  }

  const orders = orderRows.map((o) => ({
    id: o.id,
    title: o.title,
    description: o.description,
    author: o.author,
    status: o.status,
    createdAt: o.created_at instanceof Date ? o.created_at.toISOString() : String(o.created_at),
    acceptedBy: o.accepted_by,
    taskId: o.task_id,
    attachments: (attachMap.get(o.id) ?? []).map((a) => ({
      id: a.id,
      orderId: a.order_id,
      fileName: a.file_name,
      filePath: a.file_path,
      fileType: a.file_type,
      fileSize: a.file_size,
    })),
  }));

  return NextResponse.json(orders);
}

// POST - public (no auth needed for submitting orders)
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || "";
  const author = formData.get("author") as string;

  if (!title?.trim() || !author?.trim()) {
    return NextResponse.json({ error: "Название и автор обязательны" }, { status: 400 });
  }

  const [result] = await pool.query<any>(
    "INSERT INTO design_orders (title, description, author) VALUES (?, ?, ?)",
    [title.trim(), description, author.trim()]
  );
  const orderId = result.insertId;

  // Handle file uploads
  const files = formData.getAll("files") as File[];
  const attachments: any[] = [];

  for (const file of files) {
    if (!file || !file.name) continue;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to uploads directory
    const safeName = `${orderId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = `/uploads/orders/${safeName}`;
    const fs = require("fs");
    const path = require("path");
    const fullPath = path.join(process.cwd(), "public", filePath);
    fs.writeFileSync(fullPath, buffer);

    const [attachResult] = await pool.query<any>(
      "INSERT INTO design_order_attachments (order_id, file_name, file_path, file_type, file_size) VALUES (?, ?, ?, ?, ?)",
      [orderId, file.name, filePath, file.type, file.size]
    );

    attachments.push({
      id: attachResult.insertId,
      orderId,
      fileName: file.name,
      filePath,
      fileType: file.type,
      fileSize: file.size,
    });
  }

  return NextResponse.json({
    id: orderId,
    title: title.trim(),
    description,
    author: author.trim(),
    status: "new",
    createdAt: new Date().toISOString(),
    acceptedBy: null,
    taskId: null,
    attachments,
  }, { status: 201 });
}
