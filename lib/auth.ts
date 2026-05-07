import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "mkd-dashboard-secret-key-2026-change-in-production"
);
const COOKIE_NAME = "mkd_session";

export type UserRole = "admin" | "manager" | "viewer";

export interface JwtPayload {
  userId: number;
  username: string;
  role: UserRole;
  employeeName: string | null;
}

// ─── JWT ──────────────────────────────────────────────────────────

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// ─── Passwords ────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Session ──────────────────────────────────────────────────────

export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}

// ─── Permissions ──────────────────────────────────────────────────

const MANAGER_WRITABLE = new Set([
  "projects", "stages", "project_tasks",
  // "expenses" — admin-only (раньше было разрешено manager)
  "channels", "channel_tasks",
  "leads",
  "settings",
  "employees",
  "standalone-tasks",
  "posts",
  "ideas",
  "content-projects", "content-reels", "content-reel-attachments",
  "expense-requests", "advance-requests",
]);

// ─── Admin-only ресурсы (явно перечислены для документации) ─────
export const ADMIN_ONLY_RESOURCES = new Set([
  "expenses",
  "employee-salaries",
]);

export function canWrite(role: UserRole, resource: string): boolean {
  if (role === "admin") return true;
  if (role === "manager") return MANAGER_WRITABLE.has(resource);
  return false; // viewer = read only
}

export function canManageUsers(role: UserRole): boolean {
  return role === "admin";
}

export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}
