import { NextResponse } from "next/server";
import { getSession, canWrite, isAdmin, type UserRole } from "@/lib/auth";

// ─── Auth check helpers for API routes ────────────────────────────

export async function requireAuth() {
  const session = await getSession();
  if (!session) return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { session, error: null };
}

export function requireWrite(role: UserRole, resource: string) {
  if (!canWrite(role, resource)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export function requireAdmin(role: UserRole) {
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }
  return null;
}

// ─── Date formatting ──────────────────────────────────────────────

export function formatDate(d: Date | string | null): string | null {
  if (!d) return null;
  if (typeof d === "string") return d;
  return d.toISOString().slice(0, 10);
}
