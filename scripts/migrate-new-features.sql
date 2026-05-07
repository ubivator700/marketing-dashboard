-- Backup script — выполняется только если auto-migrate не отработал.
-- Запуск:  mysql -u admin -p dashboard < scripts/migrate-new-features.sql
-- Все операции идемпотентны (IF NOT EXISTS), повторный запуск безопасен.

-- 1. projects.kind — для теневых контент-проектов
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'kind'
);
SET @sql = IF(@col_exists = 0,
  "ALTER TABLE projects ADD COLUMN kind ENUM('regular','content') NOT NULL DEFAULT 'regular'",
  "SELECT 'projects.kind already exists' AS info");
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. employee_salaries (без FK на employees — конфликт коллаций)
CREATE TABLE IF NOT EXISTS employee_salaries (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_name  VARCHAR(100) NOT NULL,
  salary         INT          NOT NULL DEFAULT 0,
  bonus          INT          NOT NULL DEFAULT 0,
  effective_from DATE         NOT NULL,
  notes          TEXT         NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_emp_salary_emp (employee_name, effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. advance_requests (без FK на employees — конфликт коллаций)
CREATE TABLE IF NOT EXISTS advance_requests (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_name VARCHAR(100) NOT NULL,
  amount        INT          NOT NULL,
  reason        TEXT         NOT NULL,
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_by    VARCHAR(100) NULL,
  decided_at    DATETIME     NULL,
  comment       TEXT         NULL,
  INDEX idx_adv_req_emp (employee_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. expense_requests
CREATE TABLE IF NOT EXISTS expense_requests (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(300) NOT NULL,
  amount        INT          NOT NULL,
  responsible   VARCHAR(100) NOT NULL,
  date          DATE         NOT NULL,
  project_id    BIGINT       NULL,
  channel_id    BIGINT       NULL,
  store_id      BIGINT       NULL,
  status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_by    VARCHAR(100) NULL,
  decided_at    DATETIME     NULL,
  comment       TEXT         NULL,
  expense_id    BIGINT       NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)  ON DELETE SET NULL,
  FOREIGN KEY (channel_id) REFERENCES channels(id)  ON DELETE SET NULL,
  FOREIGN KEY (store_id)   REFERENCES stores(id)    ON DELETE SET NULL,
  FOREIGN KEY (expense_id) REFERENCES expenses(id)  ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. content_projects
CREATE TABLE IF NOT EXISTS content_projects (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  name               VARCHAR(300) NOT NULL,
  description        TEXT         NULL,
  start_date         DATE         NULL,
  deadline           DATE         NOT NULL,
  responsible        VARCHAR(100) NULL,
  priority           INT          NOT NULL DEFAULT 0,
  cancelled          TINYINT(1)   NOT NULL DEFAULT 0,
  shadow_project_id  BIGINT       NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shadow_project_id) REFERENCES projects(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. content_reels
CREATE TABLE IF NOT EXISTS content_reels (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  content_project_id BIGINT       NOT NULL,
  name               VARCHAR(300) NOT NULL,
  description        TEXT         NULL,
  start_date         DATE         NULL,
  deadline           DATE         NULL,
  priority           INT          NOT NULL DEFAULT 0,
  status             ENUM('idea','in_progress','review','published','cancelled') NOT NULL DEFAULT 'idea',
  cancelled          TINYINT(1)   NOT NULL DEFAULT 0,
  shadow_stage_id    BIGINT       NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (content_project_id) REFERENCES content_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (shadow_stage_id)    REFERENCES stages(id)            ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. content_reel_attachments
CREATE TABLE IF NOT EXISTS content_reel_attachments (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  reel_id     BIGINT        NOT NULL,
  file_name   VARCHAR(500)  NOT NULL,
  file_path   VARCHAR(1000) NOT NULL,
  file_type   VARCHAR(100)  NOT NULL,
  file_size   BIGINT        NOT NULL DEFAULT 0,
  kind        ENUM('reference','document') NOT NULL DEFAULT 'reference',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reel_id) REFERENCES content_reels(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
