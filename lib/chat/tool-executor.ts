import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { generateExcel } from "./excel";
import { storeFile } from "./file-store";
import type { FileRef } from "./types";

// ─── Execute a single tool call ──────────────────────────────────

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  collectedFiles: FileRef[],
): Promise<string> {
  switch (name) {
    case "get_leads":
      return JSON.stringify(await getLeads(args));
    case "get_expenses":
      return JSON.stringify(await getExpenses(args));
    case "get_channel_stats":
      return JSON.stringify(await getChannelStats(args));
    case "get_monthly_comparison":
      return JSON.stringify(await getMonthlyComparison(args));
    case "get_department_tasks":
      return JSON.stringify(await getDepartmentTasks(args));
    case "get_project_details":
      return JSON.stringify(await getProjectDetails(args));
    case "get_standalone_tasks":
      return JSON.stringify(await getStandaloneTasks(args));
    case "get_posts_and_ideas":
      return JSON.stringify(await getPostsAndIdeas(args));
    case "generate_excel_report":
      return JSON.stringify(await generateExcelReport(args, collectedFiles));
    case "navigate_to_page":
      return JSON.stringify(navigateToPage(args));
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ─── get_leads ───────────────────────────────────────────────────

async function getLeads(args: Record<string, unknown>) {
  let sql = `SELECT l.id, l.name, l.channel_id, c.name AS channel_name, l.contact_method, l.result, l.date, l.note,
             GROUP_CONCAT(pt.name ORDER BY pt.name SEPARATOR ', ') AS product_type_names
             FROM leads l LEFT JOIN channels c ON l.channel_id = c.id
             LEFT JOIN lead_product_types lpt ON l.id = lpt.lead_id
             LEFT JOIN product_types pt ON lpt.product_type_id = pt.id WHERE 1=1`;
  const values: unknown[] = [];

  if (args.channelId) {
    sql += " AND l.channel_id = ?";
    values.push(args.channelId);
  }
  if (args.dateFrom) {
    sql += " AND l.date >= ?";
    values.push(args.dateFrom);
  }
  if (args.dateTo) {
    sql += " AND l.date <= ?";
    values.push(args.dateTo);
  }
  if (args.result) {
    sql += " AND l.result = ?";
    values.push(args.result);
  }
  if (args.contactMethod) {
    sql += " AND l.contact_method = ?";
    values.push(args.contactMethod);
  }
  if (args.storeId) {
    sql += " AND l.store_id = ?";
    values.push(args.storeId);
  }
  if (args.productTypeId) {
    sql += " AND l.id IN (SELECT lead_id FROM lead_product_types WHERE product_type_id = ?)";
    values.push(args.productTypeId);
  }

  sql += " GROUP BY l.id ORDER BY l.date DESC LIMIT 500";
  const [rows] = await pool.query<RowDataPacket[]>(sql, values);

  // Also get a count without LIMIT
  let countSql = `SELECT COUNT(DISTINCT l.id) AS total FROM leads l WHERE 1=1`;
  const countValues: unknown[] = [];
  if (args.channelId) { countSql += " AND l.channel_id = ?"; countValues.push(args.channelId); }
  if (args.dateFrom) { countSql += " AND l.date >= ?"; countValues.push(args.dateFrom); }
  if (args.dateTo) { countSql += " AND l.date <= ?"; countValues.push(args.dateTo); }
  if (args.result) { countSql += " AND l.result = ?"; countValues.push(args.result); }
  if (args.contactMethod) { countSql += " AND l.contact_method = ?"; countValues.push(args.contactMethod); }
  if (args.storeId) { countSql += " AND l.store_id = ?"; countValues.push(args.storeId); }
  if (args.productTypeId) { countSql += " AND l.id IN (SELECT lead_id FROM lead_product_types WHERE product_type_id = ?)"; countValues.push(args.productTypeId); }
  const [countRows] = await pool.query<RowDataPacket[]>(countSql, countValues);

  return { leads: rows, total: countRows[0]?.total ?? rows.length, showing: rows.length };
}

// ─── get_expenses ────────────────────────────────────────────────

async function getExpenses(args: Record<string, unknown>) {
  let sql = `SELECT e.id, e.name, e.amount, e.responsible, e.date, e.project_id, p.name AS project_name, e.channel_id, c.name AS channel_name
             FROM expenses e
             LEFT JOIN projects p ON e.project_id = p.id
             LEFT JOIN channels c ON e.channel_id = c.id
             WHERE 1=1`;
  const values: unknown[] = [];

  if (args.projectId) { sql += " AND e.project_id = ?"; values.push(args.projectId); }
  if (args.channelId) { sql += " AND e.channel_id = ?"; values.push(args.channelId); }
  if (args.dateFrom) { sql += " AND e.date >= ?"; values.push(args.dateFrom); }
  if (args.dateTo) { sql += " AND e.date <= ?"; values.push(args.dateTo); }
  if (args.storeId) { sql += " AND e.store_id = ?"; values.push(args.storeId); }

  sql += " ORDER BY e.date DESC LIMIT 500";
  const [rows] = await pool.query<RowDataPacket[]>(sql, values);

  const totalAmount = rows.reduce((s: number, r: RowDataPacket) => s + Number(r.amount), 0);
  return { expenses: rows, count: rows.length, totalAmount };
}

// ─── get_channel_stats ───────────────────────────────────────────

async function getChannelStats(args: Record<string, unknown>) {
  const channelId = args.channelId as number;
  const dateFrom = args.dateFrom as string | undefined;
  const dateTo = args.dateTo as string | undefined;
  const storeId = args.storeId as number | undefined;
  const productTypeId = args.productTypeId as number | undefined;

  // Lead counts
  let leadSql = `SELECT
    COUNT(*) AS totalLeads,
    SUM(CASE WHEN result IN ('measurement','sale') THEN 1 ELSE 0 END) AS profitableLeads
    FROM leads WHERE channel_id = ?`;
  const leadValues: unknown[] = [channelId];
  if (dateFrom) { leadSql += " AND date >= ?"; leadValues.push(dateFrom); }
  if (dateTo) { leadSql += " AND date <= ?"; leadValues.push(dateTo); }
  if (storeId) { leadSql += " AND store_id = ?"; leadValues.push(storeId); }
  if (productTypeId) { leadSql += " AND id IN (SELECT lead_id FROM lead_product_types WHERE product_type_id = ?)"; leadValues.push(productTypeId); }
  const [leadRows] = await pool.query<RowDataPacket[]>(leadSql, leadValues);

  // Expenses
  let expSql = `SELECT COALESCE(SUM(amount), 0) AS totalExpenses FROM expenses WHERE channel_id = ?`;
  const expValues: unknown[] = [channelId];
  if (dateFrom) { expSql += " AND date >= ?"; expValues.push(dateFrom); }
  if (dateTo) { expSql += " AND date <= ?"; expValues.push(dateTo); }
  if (storeId) { expSql += " AND store_id = ?"; expValues.push(storeId); }
  const [expRows] = await pool.query<RowDataPacket[]>(expSql, expValues);

  // Channel name
  const [chRows] = await pool.query<RowDataPacket[]>("SELECT name FROM channels WHERE id = ?", [channelId]);

  const totalLeads = Number(leadRows[0]?.totalLeads ?? 0);
  const profitableLeads = Number(leadRows[0]?.profitableLeads ?? 0);
  const totalExpenses = Number(expRows[0]?.totalExpenses ?? 0);
  const costPerLead = totalLeads > 0 ? Math.round(totalExpenses / totalLeads) : null;

  return {
    channelName: chRows[0]?.name ?? "Неизвестен",
    totalLeads,
    profitableLeads,
    totalExpenses,
    costPerLead,
  };
}

// ─── get_monthly_comparison ──────────────────────────────────────

async function getMonthlyComparison(args: Record<string, unknown>) {
  const metric = args.metric as string;
  const month1 = args.month1 as string; // "YYYY-MM"
  const month2 = args.month2 as string;
  const channelId = args.channelId as number | undefined;
  const monthlyStoreId = args.storeId as number | undefined;
  const monthlyProductTypeId = args.productTypeId as number | undefined;

  async function getMonthValue(ym: string): Promise<number> {
    const [y, m] = ym.split("-").map(Number);
    const from = `${y}-${String(m).padStart(2, "0")}-01`;
    const to = `${y}-${String(m).padStart(2, "0")}-31`;

    if (metric === "leads" || metric === "profitable_leads") {
      let sql = `SELECT COUNT(*) AS cnt FROM leads WHERE date >= ? AND date <= ?`;
      if (metric === "profitable_leads") sql = `SELECT COUNT(*) AS cnt FROM leads WHERE date >= ? AND date <= ? AND result IN ('measurement','sale')`;
      const vals: unknown[] = [from, to];
      if (channelId) { sql += " AND channel_id = ?"; vals.push(channelId); }
      if (monthlyStoreId) { sql += " AND store_id = ?"; vals.push(monthlyStoreId); }
      if (monthlyProductTypeId) { sql += " AND id IN (SELECT lead_id FROM lead_product_types WHERE product_type_id = ?)"; vals.push(monthlyProductTypeId); }
      const [rows] = await pool.query<RowDataPacket[]>(sql, vals);
      return Number(rows[0]?.cnt ?? 0);
    }
    if (metric === "expenses") {
      let sql = `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE date >= ? AND date <= ?`;
      const vals: unknown[] = [from, to];
      if (channelId) { sql += " AND channel_id = ?"; vals.push(channelId); }
      if (monthlyStoreId) { sql += " AND store_id = ?"; vals.push(monthlyStoreId); }
      const [rows] = await pool.query<RowDataPacket[]>(sql, vals);
      return Number(rows[0]?.total ?? 0);
    }
    return 0;
  }

  const value1 = await getMonthValue(month1);
  const value2 = await getMonthValue(month2);
  const change = value1 > 0 ? Math.round(((value2 - value1) / value1) * 100) : value2 > 0 ? 100 : 0;

  return { metric, month1, value1, month2, value2, changePercent: change };
}

// ─── get_department_tasks ────────────────────────────────────────

async function getDepartmentTasks(args: Record<string, unknown>) {
  const departmentId = args.departmentId as string;
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.id, t.text, t.status, t.priority, t.due_date, t.start_date, d.name AS department_name
     FROM tasks t JOIN departments d ON t.department_id = d.id
     WHERE t.department_id = ? ORDER BY t.due_date`,
    [departmentId],
  );
  const summary = {
    todo: rows.filter((r) => r.status === "todo").length,
    in_progress: rows.filter((r) => r.status === "in_progress").length,
    done: rows.filter((r) => r.status === "done").length,
  };
  return { departmentId, tasks: rows, summary };
}

// ─── get_project_details ─────────────────────────────────────────

async function getProjectDetails(args: Record<string, unknown>) {
  const projectId = args.projectId as number;
  const [projects] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, goal, description, deadline, priority, responsible FROM projects WHERE id = ?",
    [projectId],
  );
  if (projects.length === 0) return { error: "Проект не найден" };

  const [stages] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, result, description, deadline FROM stages WHERE project_id = ? ORDER BY id",
    [projectId],
  );
  const [tasks] = await pool.query<RowDataPacket[]>(
    `SELECT pt.id, pt.name, pt.description, pt.assignee, pt.deadline, pt.status, pt.stage_id
     FROM project_tasks pt JOIN stages s ON pt.stage_id = s.id
     WHERE s.project_id = ? ORDER BY pt.stage_id, pt.id`,
    [projectId],
  );

  const stagesWithTasks = stages.map((s) => ({
    ...s,
    tasks: tasks.filter((t) => t.stage_id === s.id),
  }));

  const allTasks = tasks;
  const completion =
    allTasks.length > 0
      ? Math.round((allTasks.filter((t) => t.status === "done").length / allTasks.length) * 100)
      : 0;

  return { project: projects[0], stages: stagesWithTasks, completion };
}

// ─── get_standalone_tasks ────────────────────────────────────────

async function getStandaloneTasks(args: Record<string, unknown>) {
  let sql = `SELECT st.id, st.name, st.description, st.assignee, st.deadline, st.status, st.channel_id, c.name AS channel_name
             FROM standalone_tasks st LEFT JOIN channels c ON st.channel_id = c.id WHERE 1=1`;
  const values: unknown[] = [];
  if (args.status) { sql += " AND st.status = ?"; values.push(args.status); }
  if (args.assignee) { sql += " AND st.assignee = ?"; values.push(args.assignee); }
  sql += " ORDER BY st.deadline";
  const [rows] = await pool.query<RowDataPacket[]>(sql, values);
  return { tasks: rows, count: rows.length };
}

// ─── get_posts_and_ideas ─────────────────────────────────────────

async function getPostsAndIdeas(args: Record<string, unknown>) {
  const type = (args.type as string) || "all";
  const status = args.status as string | undefined;
  const result: Record<string, unknown> = {};

  if (type === "posts" || type === "all") {
    let sql = "SELECT id, title, text, topic, product, status, date FROM posts WHERE 1=1";
    const vals: unknown[] = [];
    if (status && type === "posts") { sql += " AND status = ?"; vals.push(status); }
    sql += " ORDER BY date DESC LIMIT 100";
    const [rows] = await pool.query<RowDataPacket[]>(sql, vals);
    result.posts = rows;
  }

  if (type === "ideas" || type === "all") {
    let sql = "SELECT id, title, description, status, date FROM ideas WHERE 1=1";
    const vals: unknown[] = [];
    if (status && type === "ideas") { sql += " AND status = ?"; vals.push(status); }
    sql += " ORDER BY date DESC LIMIT 100";
    const [rows] = await pool.query<RowDataPacket[]>(sql, vals);
    result.ideas = rows;
  }

  return result;
}

// ─── generate_excel_report ───────────────────────────────────────

async function generateExcelReport(args: Record<string, unknown>, collectedFiles: FileRef[]) {
  const filename = (args.filename as string) || "report";
  const sheets = args.sheets as Array<{ name: string; columns: string[]; rows: unknown[][] }>;

  try {
    const buffer = await generateExcel(filename, sheets);
    const fullName = `${filename}.xlsx`;
    const fileId = storeFile(buffer, fullName);
    collectedFiles.push({ id: fileId, name: fullName });
    return { success: true, fileId, fileName: fullName, message: "Excel-файл создан и доступен для скачивания." };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ─── navigate_to_page ────────────────────────────────────────────

const PAGE_MAP: Record<string, { path: string; description: string }> = {
  dashboard: { path: "/", description: "Главная страница: обзор отделов, задачи, цели, доска задач, календарь" },
  overview: { path: "/overview", description: "Обзор KPI: графики лидов, расходов, стоимость привлечения по месяцам и каналам" },
  projects: { path: "/projects", description: "Проекты: список всех проектов со стадиями, задачами и дедлайнами" },
  content: { path: "/content", description: "Контент: посты (proposed/approved) и идеи для контент-маркетинга" },
  channels: { path: "/channels", description: "Каналы: маркетинговые каналы (loyalty/digital/offline) с задачами и лидами" },
  leads: { path: "/leads", description: "Лиды: полная таблица заявок с фильтрацией по каналу, дате и результату" },
  expenses: { path: "/expenses", description: "Расходы: таблица расходов с привязкой к проектам и каналам" },
  stores: { path: "/stores", description: "Магазины: торговые точки компании (CRUD, привязка лидов и расходов)" },
  products: { path: "/products", description: "Товары: типы товаров (двери, окна, полы и др.) со средним чеком и наценкой" },
  organization: { path: "/organization", description: "Организация: сотрудники, расписание, отделы" },
  admin: { path: "/admin", description: "Админ-панель: управление пользователями (только для администраторов)" },
};

function navigateToPage(args: Record<string, unknown>) {
  const page = args.page as string;
  const info = PAGE_MAP[page];
  if (!info) return { error: "Страница не найдена" };
  return { page, path: info.path, description: info.description };
}
