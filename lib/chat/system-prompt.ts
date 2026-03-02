import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

// ─── Build the system prompt with a live data summary ────────────

export async function buildSystemPrompt(userRole: string): Promise<string> {
  // Fetch lightweight summaries in parallel
  const [
    [channels],
    [departments],
    [projects],
    [employees],
    [settings],
    [leadCount],
    [expenseTotal],
    [currentMonthLeads],
    [storesData],
    [productTypesData],
  ] = await Promise.all([
    pool.query<RowDataPacket[]>("SELECT id, name, `group` FROM channels ORDER BY id"),
    pool.query<RowDataPacket[]>("SELECT id, name FROM departments ORDER BY id"),
    pool.query<RowDataPacket[]>("SELECT id, name, deadline, priority FROM projects ORDER BY priority DESC"),
    pool.query<RowDataPacket[]>("SELECT name, department_id, roles FROM employees ORDER BY name"),
    pool.query<RowDataPacket[]>("SELECT `key`, `value` FROM settings"),
    pool.query<RowDataPacket[]>("SELECT COUNT(*) AS cnt FROM leads"),
    pool.query<RowDataPacket[]>("SELECT COALESCE(SUM(amount), 0) AS total FROM expenses"),
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM leads WHERE date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
    ),
    pool.query<RowDataPacket[]>("SELECT id, name FROM stores ORDER BY id"),
    pool.query<RowDataPacket[]>("SELECT id, name, category, avg_check, avg_markup FROM product_types ORDER BY id"),
  ]);

  const settingsMap: Record<string, string> = {};
  for (const s of settings) settingsMap[s.key] = s.value;

  const roleDescriptions: Record<string, string> = {
    admin: "Администратор — полный доступ",
    manager: "Менеджер — чтение и запись данных",
    viewer: "Наблюдатель — только чтение",
  };

  const channelList = channels.map((c: RowDataPacket) => `  - ${c.name} (id:${c.id}, группа:${c.group})`).join("\n");
  const deptList = departments.map((d: RowDataPacket) => `  - ${d.name} (id:${d.id})`).join("\n");
  const projectList = projects.map((p: RowDataPacket) => `  - ${p.name} (id:${p.id}, дедлайн:${p.deadline})`).join("\n");
  const employeeList = employees.map((e: RowDataPacket) => `  - ${e.name} (отдел:${e.department_id}, роли:${e.roles})`).join("\n");
  const storeList = storesData.map((s: RowDataPacket) => `  - ${s.name} (id:${s.id})`).join("\n");
  const categoryLabels: Record<string, string> = { doors: "Двери", windows: "Окна", floors: "Полы", other: "Другое" };
  const productTypeList = productTypesData.map((pt: RowDataPacket) => `  - ${pt.name} (id:${pt.id}, категория:${categoryLabels[pt.category] || pt.category}, ср.чек:${pt.avg_check}, наценка:${pt.avg_markup}%)`).join("\n");

  return `Ты — AI-ассистент маркетингового дашборда. Отвечай на русском языке. Будь конкретным и полезным.
Текущая дата: ${new Date().toISOString().slice(0, 10)}

РОЛЬ ПОЛЬЗОВАТЕЛЯ: ${userRole} (${roleDescriptions[userRole] || userRole})

═══ СТРУКТУРА ДАШБОРДА ═══
- Главная (/) — отделы, цели, задачи, доска задач, календарь
- Обзор (/overview) — KPI, графики лидов, расходов, стоимость привлечения по месяцам
- Проекты (/projects) — список проектов со стадиями и задачами
- Контент (/content) — посты и идеи для контент-маркетинга
- Каналы (/channels) — маркетинговые каналы (loyalty/digital/offline) с задачами
- Лиды (/leads) — таблица лидов с фильтрацией
- Расходы (/expenses) — таблица расходов
- Магазины (/stores) — торговые точки (создание, переименование, удаление)
- Товары (/products) — типы товаров (двери, окна, полы и др.) со средним чеком и наценкой
- Организация (/organization) — сотрудники и расписание
- Админ (/admin) — управление пользователями (только admin)

═══ НАСТРОЙКИ ═══
- Средний чек: ${settingsMap.averageCheck || "0"} руб.
- План лидов в месяц: ${settingsMap.monthlyLeadPlan || "0"}
- Месячный бюджет: ${settingsMap.monthlyBudget || "0"} руб.

═══ ТОРГОВЫЕ ТОЧКИ ═══
${storeList || "  (нет торговых точек)"}

═══ ТИПЫ ТОВАРОВ ═══
${productTypeList || "  (нет типов товаров)"}

═══ КАНАЛЫ ═══
${channelList || "  (нет каналов)"}

═══ ОТДЕЛЫ ═══
${deptList || "  (нет отделов)"}

═══ ПРОЕКТЫ ═══
${projectList || "  (нет проектов)"}

═══ СОТРУДНИКИ ═══
${employeeList || "  (нет сотрудников)"}

═══ ТЕКУЩАЯ СТАТИСТИКА ═══
- Всего лидов: ${leadCount[0]?.cnt ?? 0}
- Лидов в текущем месяце: ${currentMonthLeads[0]?.cnt ?? 0}
- Общая сумма расходов: ${expenseTotal[0]?.total ?? 0} руб.
- Количество проектов: ${projects.length}

═══ ФОРМУЛЫ ═══
- Результативный лид = лид с результатом "measurement" (замер) или "sale" (продажа)
- Стоимость привлечения лида = расходы / количество лидов

═══ ИНСТРУКЦИИ ═══
1. Используй инструменты для получения детальных данных перед расчётами
2. Всегда показывай промежуточные числа в расчётах (например: "Октябрь: 45 лидов, Февраль: 62 лида, рост: +37.8%")
3. При генерации Excel-отчётов описывай что в них содержится
4. Для навигации подсказывай конкретный раздел и путь
5. Если вопрос требует данных, которых у тебя нет в сводке — вызови соответствующий инструмент
6. Будь кратким, но точным. Не повторяй весь промпт в ответе.
7. Для фильтрации по торговой точке используй параметр storeId, по типу товара — productTypeId в инструментах get_leads, get_channel_stats, get_monthly_comparison.`;
}
