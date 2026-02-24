import { NextRequest, NextResponse } from "next/server";
import { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import { requireAuth, requireWrite, formatDate } from "@/lib/api-helpers";

interface SettingRow extends RowDataPacket {
  key: string;
  value: string;
}

const KEY_MAP: Record<string, string> = {
  averageCheck: "averageCheck",
  monthlyLeadPlan: "monthlyLeadPlan",
  dailyLeadPlan: "dailyLeadPlan",
  monthlyBudget: "monthlyBudget",
};

async function fetchSettings() {
  const [rows] = await pool.query<SettingRow[]>("SELECT `key`, `value` FROM settings");

  const settings: Record<string, number> = {
    averageCheck: 0,
    monthlyLeadPlan: 0,
    dailyLeadPlan: 0,
    monthlyBudget: 0,
  };

  for (const row of rows) {
    if (row.key in settings) {
      settings[row.key] = Number(row.value);
    }
  }

  return settings;
}

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const settings = await fetchSettings();

  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const writeError = requireWrite(session!.role, "settings");
  if (writeError) return writeError;

  const body = await request.json();

  for (const key of Object.keys(KEY_MAP)) {
    if (body[key] !== undefined) {
      await pool.query(
        "INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)",
        [key, String(body[key])]
      );
    }
  }

  const settings = await fetchSettings();

  return NextResponse.json(settings);
}
