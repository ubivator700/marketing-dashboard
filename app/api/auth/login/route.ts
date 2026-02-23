import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { comparePassword, signToken, SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Введите логин и пароль" }, { status: 400 });
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, username, password_hash, employee_name, role FROM users WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }

    const user = rows[0];
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }

    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      employeeName: user.employee_name,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employeeName: user.employee_name,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    console.error("Login error:", message, stack);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
