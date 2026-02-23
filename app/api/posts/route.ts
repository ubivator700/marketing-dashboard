import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

interface PostRow extends RowDataPacket {
  id: number;
  title: string;
  text: string;
  topic: string;
  product: string;
  status: string;
  photo_url: string | null;
  date: Date;
}

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const [rows] = await pool.query<PostRow[]>(
    "SELECT * FROM posts ORDER BY date DESC"
  );

  const posts = rows.map((r) => ({
    id: r.id,
    title: r.title,
    text: r.text,
    topic: r.topic,
    product: r.product,
    status: r.status,
    photoUrl: r.photo_url,
    date: formatDate(r.date),
  }));

  return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "posts");
  if (writeError) return writeError;

  const body = await request.json();
  const { id, title, text, topic, product, status, photoUrl, date } = body;

  let insertId: number;
  if (id) {
    await pool.query(
      "INSERT INTO posts (id, title, text, topic, product, status, photo_url, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, title, text, topic ?? "", product ?? "other", status ?? "proposed", photoUrl ?? null, date]
    );
    insertId = id;
  } else {
    const [result] = await pool.query(
      "INSERT INTO posts (title, text, topic, product, status, photo_url, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [title, text, topic ?? "", product ?? "other", status ?? "proposed", photoUrl ?? null, date]
    );
    insertId = (result as { insertId: number }).insertId;
  }

  return NextResponse.json(
    { id: insertId, title, text, topic: topic ?? "", product: product ?? "other", status: status ?? "proposed", photoUrl: photoUrl ?? null, date },
    { status: 201 }
  );
}
