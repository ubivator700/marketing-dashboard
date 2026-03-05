import mysql from "mysql2/promise";

/* ═══════════════════════════════════════════════════════════════════
   AUTO-MIGRATE  —  автоматическая проверка и создание БД-схемы.

   Запускается один раз при старте сервера (instrumentation.ts).

   Логика:
   1. Создать базу данных, если не существует
   2. Создать все таблицы (CREATE TABLE IF NOT EXISTS)
   3. Проверить и добавить недостающие колонки (ALTER TABLE)
   4. Создать дефолтного admin-пользователя
   5. Создать базовые settings

   Безопасно для повторного запуска — все операции идемпотентны.
   ═══════════════════════════════════════════════════════════════════ */

const DB_HOST = process.env.DB_HOST ?? "localhost";
const DB_PORT = Number(process.env.DB_PORT ?? 3306);
const DB_NAME = process.env.DB_NAME ?? "dashboard";
const DB_USER = process.env.DB_USER ?? "admin";
const DB_PASSWORD = process.env.DB_PASSWORD ?? "test1234";

// ─── Helper: check if a table exists ───────────────────────────
async function tableExists(conn: mysql.Connection, table: string): Promise<boolean> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [DB_NAME, table]
  );
  return rows[0].cnt > 0;
}

// ─── Helper: check if a column exists ──────────────────────────
async function columnExists(conn: mysql.Connection, table: string, column: string): Promise<boolean> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_NAME, table, column]
  );
  return rows[0].cnt > 0;
}

// ─── Helper: check if a constraint exists ──────────────────────
async function constraintExists(conn: mysql.Connection, table: string, constraint: string): Promise<boolean> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [DB_NAME, table, constraint]
  );
  return rows[0].cnt > 0;
}

// ─── Helper: safe ALTER — add column if missing ────────────────
async function ensureColumn(
  conn: mysql.Connection,
  table: string,
  column: string,
  definition: string
): Promise<void> {
  if (!(await columnExists(conn, table, column))) {
    console.log(`  [migrate] ADD COLUMN ${table}.${column}`);
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

// ─── Helper: safe ALTER — add FK if missing ────────────────────
async function ensureFK(
  conn: mysql.Connection,
  table: string,
  constraintName: string,
  column: string,
  refTable: string,
  refColumn: string,
  onDelete: string = "SET NULL"
): Promise<void> {
  if (!(await constraintExists(conn, table, constraintName))) {
    console.log(`  [migrate] ADD FK ${constraintName} on ${table}`);
    await conn.query(
      `ALTER TABLE \`${table}\` ADD CONSTRAINT \`${constraintName}\` FOREIGN KEY (\`${column}\`) REFERENCES \`${refTable}\`(\`${refColumn}\`) ON DELETE ${onDelete}`
    );
  }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════

export async function runAutoMigrate() {
  console.log("[auto-migrate] Starting database check…");

  // 1. Connect WITHOUT database to create it if needed
  const rootConn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    charset: "utf8mb4",
  });

  await rootConn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await rootConn.end();

  // 2. Connect to the database
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    charset: "utf8mb4",
    multipleStatements: true,
  });

  await conn.query("SET NAMES utf8mb4");
  await conn.query("SET FOREIGN_KEY_CHECKS = 1");

  try {
    // ───────────────────────────────────────────────────────────
    //  DEPARTMENTS
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "departments"))) {
      console.log("  [migrate] CREATE TABLE departments");
      await conn.query(`
        CREATE TABLE departments (
          id          VARCHAR(20)  PRIMARY KEY,
          name        VARCHAR(100) NOT NULL,
          person      VARCHAR(100) NOT NULL,
          color       VARCHAR(20)  NOT NULL,
          icon        VARCHAR(10)  NOT NULL,
          description TEXT         NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // ───────────────────────────────────────────────────────────
    //  GOALS
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "goals"))) {
      console.log("  [migrate] CREATE TABLE goals");
      await conn.query(`
        CREATE TABLE goals (
          id            BIGINT AUTO_INCREMENT PRIMARY KEY,
          text          VARCHAR(500) NOT NULL,
          progress      INT          NOT NULL DEFAULT 0,
          kpi           VARCHAR(100) NOT NULL DEFAULT '',
          department_id VARCHAR(20)  NOT NULL,
          FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // ───────────────────────────────────────────────────────────
    //  TASKS (department tasks)
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "tasks"))) {
      console.log("  [migrate] CREATE TABLE tasks");
      await conn.query(`
        CREATE TABLE tasks (
          id            BIGINT AUTO_INCREMENT PRIMARY KEY,
          text          VARCHAR(500)                      NOT NULL,
          status        ENUM('todo','in_progress','done') NOT NULL DEFAULT 'todo',
          priority      ENUM('high','medium','low')       NOT NULL DEFAULT 'medium',
          due_date      DATE                              NOT NULL,
          start_date    DATE                              NULL,
          due_time      VARCHAR(5)                        NULL,
          duration      INT                               NULL,
          department_id VARCHAR(20)                       NOT NULL,
          FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // ───────────────────────────────────────────────────────────
    //  EMPLOYEES
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "employees"))) {
      console.log("  [migrate] CREATE TABLE employees");
      await conn.query(`
        CREATE TABLE employees (
          name          VARCHAR(100) PRIMARY KEY,
          department_id VARCHAR(20)  NOT NULL,
          roles         JSON         NOT NULL,
          color         VARCHAR(20)  NOT NULL,
          FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!(await tableExists(conn, "employee_schedule"))) {
      console.log("  [migrate] CREATE TABLE employee_schedule");
      await conn.query(`
        CREATE TABLE employee_schedule (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          employee_name VARCHAR(100)                     NOT NULL,
          date          DATE                             NOT NULL,
          type          ENUM('work','dayoff','vacation') NOT NULL,
          FOREIGN KEY (employee_name) REFERENCES employees(name) ON DELETE CASCADE,
          UNIQUE KEY unique_emp_date (employee_name, date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // ───────────────────────────────────────────────────────────
    //  PLANS (Plan > PlanItem > Project hierarchy)
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "plans"))) {
      console.log("  [migrate] CREATE TABLE plans");
      await conn.query(`
        CREATE TABLE plans (
          id          BIGINT AUTO_INCREMENT PRIMARY KEY,
          name        VARCHAR(200) NOT NULL,
          deadline    DATE         NOT NULL,
          sort_order  INT          NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // ───────────────────────────────────────────────────────────
    //  PLAN_ITEMS
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "plan_items"))) {
      console.log("  [migrate] CREATE TABLE plan_items");
      await conn.query(`
        CREATE TABLE plan_items (
          id          BIGINT AUTO_INCREMENT PRIMARY KEY,
          name        VARCHAR(200) NOT NULL,
          result      TEXT         NOT NULL,
          deadline    DATE         NOT NULL,
          responsible VARCHAR(100) NOT NULL DEFAULT '',
          color       VARCHAR(20)  NOT NULL DEFAULT 'blue',
          sort_order  INT          NOT NULL DEFAULT 0,
          plan_id     BIGINT       NOT NULL,
          FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // ───────────────────────────────────────────────────────────
    //  PROJECTS
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "projects"))) {
      console.log("  [migrate] CREATE TABLE projects");
      await conn.query(`
        CREATE TABLE projects (
          id          BIGINT AUTO_INCREMENT PRIMARY KEY,
          name        VARCHAR(200) NOT NULL,
          goal        TEXT         NOT NULL,
          description TEXT         NOT NULL,
          deadline    DATE         NOT NULL,
          priority    BIGINT       NOT NULL DEFAULT 0,
          responsible VARCHAR(100) NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }
    await ensureColumn(conn, "projects", "responsible", "VARCHAR(100) NULL");
    await ensureColumn(conn, "projects", "plan_item_id", "BIGINT NULL");
    await ensureFK(conn, "projects", "fk_projects_plan_item", "plan_item_id", "plan_items", "id", "SET NULL");
    await ensureColumn(conn, "plans", "start_date", "DATE NULL");
    await ensureColumn(conn, "plan_items", "start_date", "DATE NULL");
    await ensureColumn(conn, "projects", "start_date", "DATE NULL");

    // ───────────────────────────────────────────────────────────
    //  STAGES
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "stages"))) {
      console.log("  [migrate] CREATE TABLE stages");
      await conn.query(`
        CREATE TABLE stages (
          id          BIGINT AUTO_INCREMENT PRIMARY KEY,
          name        VARCHAR(200) NOT NULL,
          result      TEXT         NOT NULL,
          description TEXT         NOT NULL,
          deadline    DATE         NOT NULL,
          project_id  BIGINT       NOT NULL,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // ───────────────────────────────────────────────────────────
    //  PROJECT_TASKS
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "project_tasks"))) {
      console.log("  [migrate] CREATE TABLE project_tasks");
      await conn.query(`
        CREATE TABLE project_tasks (
          id          BIGINT AUTO_INCREMENT PRIMARY KEY,
          name        VARCHAR(500) NOT NULL,
          description TEXT         NOT NULL,
          assignee    VARCHAR(100) NOT NULL DEFAULT '',
          deadline    DATE         NOT NULL,
          due_time    VARCHAR(5)   NULL,
          duration    INT          NULL,
          status      ENUM('todo','in_progress','done') NOT NULL DEFAULT 'todo',
          stage_id    BIGINT       NOT NULL,
          project_id  BIGINT       NOT NULL,
          FOREIGN KEY (stage_id)   REFERENCES stages(id)   ON DELETE CASCADE,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }
    await ensureColumn(conn, "stages", "start_date", "DATE NULL");
    await ensureColumn(conn, "project_tasks", "start_date", "DATE NULL");
    await ensureColumn(conn, "project_tasks", "due_time", "VARCHAR(5) NULL");
    await ensureColumn(conn, "project_tasks", "duration", "INT NULL");

    // ───────────────────────────────────────────────────────────
    //  CHANNELS
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "channels"))) {
      console.log("  [migrate] CREATE TABLE channels");
      await conn.query(`
        CREATE TABLE channels (
          id      BIGINT AUTO_INCREMENT PRIMARY KEY,
          name    VARCHAR(200) NOT NULL,
          \`group\` ENUM('loyalty','digital','offline') NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // ───────────────────────────────────────────────────────────
    //  CHANNEL_TASKS
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "channel_tasks"))) {
      console.log("  [migrate] CREATE TABLE channel_tasks");
      await conn.query(`
        CREATE TABLE channel_tasks (
          id         BIGINT AUTO_INCREMENT PRIMARY KEY,
          text       VARCHAR(500) NOT NULL,
          done       BOOLEAN      NOT NULL DEFAULT FALSE,
          deadline   DATE         NULL,
          channel_id BIGINT       NOT NULL,
          FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // ───────────────────────────────────────────────────────────
    //  STORES
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "stores"))) {
      console.log("  [migrate] CREATE TABLE stores");
      await conn.query(`
        CREATE TABLE stores (
          id   BIGINT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(200) NOT NULL,
          tbu  INT NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }
    await ensureColumn(conn, "stores", "tbu", "INT NOT NULL DEFAULT 0");

    // ───────────────────────────────────────────────────────────
    //  PRODUCT_TYPES
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "product_types"))) {
      console.log("  [migrate] CREATE TABLE product_types");
      await conn.query(`
        CREATE TABLE product_types (
          id         BIGINT AUTO_INCREMENT PRIMARY KEY,
          name       VARCHAR(200) NOT NULL,
          category   ENUM('doors','windows','floors','other') NOT NULL DEFAULT 'other',
          avg_check  INT NOT NULL DEFAULT 0,
          avg_markup INT NOT NULL DEFAULT 0
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // ───────────────────────────────────────────────────────────
    //  LEADS
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "leads"))) {
      console.log("  [migrate] CREATE TABLE leads");
      await conn.query(`
        CREATE TABLE leads (
          id             BIGINT AUTO_INCREMENT PRIMARY KEY,
          name           VARCHAR(200)                                 NOT NULL,
          channel_id     BIGINT                                       NULL,
          contact_method ENUM('salon','phone','social','old_request') NOT NULL,
          result         ENUM('measurement','sale','deferred')        NOT NULL,
          date           DATE                                         NOT NULL,
          note           TEXT                                         NULL,
          store_id       BIGINT                                       NULL,
          FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL,
          FOREIGN KEY (store_id)   REFERENCES stores(id)   ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }
    // Ensure store_id column exists (was added in migration)
    await ensureColumn(conn, "leads", "store_id", "BIGINT NULL");
    if (await columnExists(conn, "leads", "store_id")) {
      await ensureFK(conn, "leads", "fk_leads_store_auto", "store_id", "stores", "id", "SET NULL");
    }

    // Drop old product_type_id column if it exists (migrated to many-to-many)
    if (await columnExists(conn, "leads", "product_type_id")) {
      console.log("  [migrate] DROP old leads.product_type_id column");
      // First drop FK if exists
      if (await constraintExists(conn, "leads", "fk_leads_product_type")) {
        await conn.query("ALTER TABLE leads DROP FOREIGN KEY fk_leads_product_type");
      }
      await conn.query("ALTER TABLE leads DROP COLUMN product_type_id");
    }

    // Ensure column definitions are up-to-date (fixes servers where the table was created with different schema)
    console.log("  [migrate] Ensuring leads column definitions are correct");
    await conn.query(`ALTER TABLE leads MODIFY COLUMN channel_id BIGINT NULL`);
    await conn.query(`ALTER TABLE leads MODIFY COLUMN contact_method ENUM('salon','phone','social','old_request') NOT NULL`);
    await conn.query(`ALTER TABLE leads MODIFY COLUMN result ENUM('measurement','sale','deferred') NOT NULL`);

    // ───────────────────────────────────────────────────────────
    //  LEAD_PRODUCT_TYPES (many-to-many)
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "lead_product_types"))) {
      console.log("  [migrate] CREATE TABLE lead_product_types");
      await conn.query(`
        CREATE TABLE lead_product_types (
          lead_id         BIGINT NOT NULL,
          product_type_id BIGINT NOT NULL,
          PRIMARY KEY (lead_id, product_type_id),
          FOREIGN KEY (lead_id)         REFERENCES leads(id)         ON DELETE CASCADE,
          FOREIGN KEY (product_type_id) REFERENCES product_types(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // ───────────────────────────────────────────────────────────
    //  EXPENSES
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "expenses"))) {
      console.log("  [migrate] CREATE TABLE expenses");
      await conn.query(`
        CREATE TABLE expenses (
          id          BIGINT AUTO_INCREMENT PRIMARY KEY,
          name        VARCHAR(300) NOT NULL,
          amount      INT          NOT NULL,
          responsible VARCHAR(100) NOT NULL,
          date        DATE         NOT NULL,
          project_id  BIGINT       NULL,
          channel_id  BIGINT       NULL,
          store_id    BIGINT       NULL,
          FOREIGN KEY (project_id) REFERENCES projects(id)  ON DELETE SET NULL,
          FOREIGN KEY (channel_id) REFERENCES channels(id)  ON DELETE SET NULL,
          FOREIGN KEY (store_id)   REFERENCES stores(id)    ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }
    // Ensure store_id column exists (was added in migration)
    await ensureColumn(conn, "expenses", "store_id", "BIGINT NULL");
    if (await columnExists(conn, "expenses", "store_id")) {
      await ensureFK(conn, "expenses", "fk_expenses_store_auto", "store_id", "stores", "id", "SET NULL");
    }

    // ───────────────────────────────────────────────────────────
    //  STANDALONE_TASKS
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "standalone_tasks"))) {
      console.log("  [migrate] CREATE TABLE standalone_tasks");
      await conn.query(`
        CREATE TABLE standalone_tasks (
          id          BIGINT AUTO_INCREMENT PRIMARY KEY,
          name        VARCHAR(500) NOT NULL,
          description TEXT         NULL,
          assignee    VARCHAR(100) NOT NULL DEFAULT '',
          deadline    DATE         NOT NULL,
          due_time    VARCHAR(5)   NULL,
          duration    INT          NULL,
          status      ENUM('todo','in_progress','done') NOT NULL DEFAULT 'todo',
          channel_id  BIGINT       NULL,
          FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // ───────────────────────────────────────────────────────────
    //  RECURRING_TASKS
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "recurring_tasks"))) {
      console.log("  [migrate] CREATE TABLE recurring_tasks");
      await conn.query(`
        CREATE TABLE recurring_tasks (
          id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
          name                VARCHAR(500)                        NOT NULL,
          description         TEXT                                NULL,
          assignee            VARCHAR(100)                        NOT NULL DEFAULT '',
          recurrence_type     ENUM('daily','weekly','monthly')    NOT NULL,
          recurrence_interval INT                                 NOT NULL DEFAULT 1,
          recurrence_days     VARCHAR(20)                         NULL,
          channel_id          BIGINT                              NULL,
          due_time            VARCHAR(5)                          NULL,
          duration            INT                                 NULL,
          status              ENUM('active','paused')             NOT NULL DEFAULT 'active',
          FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // ───────────────────────────────────────────────────────────
    //  SETTINGS
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "settings"))) {
      console.log("  [migrate] CREATE TABLE settings");
      await conn.query(`
        CREATE TABLE settings (
          \`key\`   VARCHAR(100) PRIMARY KEY,
          \`value\` TEXT         NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // Ensure default settings exist
    const defaultSettings: Record<string, string> = {
      averageCheck: "8000",
      monthlyLeadPlan: "200",
      dailyLeadPlan: "7",
      monthlyBudget: "0",
      taxCoefficient: "0.07",
    };
    for (const [key, value] of Object.entries(defaultSettings)) {
      await conn.query(
        "INSERT IGNORE INTO settings (`key`, `value`) VALUES (?, ?)",
        [key, value]
      );
    }

    // ───────────────────────────────────────────────────────────
    //  USERS
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "users"))) {
      console.log("  [migrate] CREATE TABLE users");
      await conn.query(`
        CREATE TABLE users (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          username      VARCHAR(100) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          employee_name VARCHAR(100) NULL,
          role          ENUM('admin','manager','viewer') NOT NULL DEFAULT 'viewer'
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // Ensure default admin user exists (password: admin123)
    const [adminRows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) AS cnt FROM users WHERE username = 'admin'"
    );
    if (adminRows[0].cnt === 0) {
      console.log("  [migrate] INSERT default admin user");
      // bcrypt hash for "admin123"
      const adminHash = "$2b$10$0brt1kKju/sef3JWFSMqWejCiNe4WH8YY54SYqZ3ENnDraEjJrxG2";
      await conn.query(
        "INSERT INTO users (username, password_hash, employee_name, role) VALUES (?, ?, NULL, 'admin')",
        ["admin", adminHash]
      );
    }

    // ───────────────────────────────────────────────────────────
    //  POSTS
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "posts"))) {
      console.log("  [migrate] CREATE TABLE posts");
      await conn.query(`
        CREATE TABLE posts (
          id        BIGINT AUTO_INCREMENT PRIMARY KEY,
          title     VARCHAR(300)  NOT NULL,
          text      TEXT          NOT NULL,
          topic     VARCHAR(200)  NOT NULL DEFAULT '',
          product   ENUM('windows','balconies','entrance_doors','interior_doors','flooring','other') NOT NULL DEFAULT 'other',
          status    ENUM('proposed','approved') NOT NULL DEFAULT 'proposed',
          photo_url VARCHAR(500)  NULL,
          date      DATE          NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    // ───────────────────────────────────────────────────────────
    //  IDEAS
    // ───────────────────────────────────────────────────────────
    if (!(await tableExists(conn, "ideas"))) {
      console.log("  [migrate] CREATE TABLE ideas");
      await conn.query(`
        CREATE TABLE ideas (
          id          BIGINT AUTO_INCREMENT PRIMARY KEY,
          title       VARCHAR(300)  NOT NULL,
          description TEXT          NOT NULL,
          status      ENUM('new','in_progress','approved','rejected') NOT NULL DEFAULT 'new',
          date        DATE          NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    console.log("[auto-migrate] ✅ Database schema is up to date.");
  } catch (err) {
    console.error("[auto-migrate] ❌ Migration failed:", err);
    throw err;
  } finally {
    await conn.end();
  }
}
