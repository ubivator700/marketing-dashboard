-- Marketing Dashboard — MySQL Schema & Seed Data
-- Run: mysql -u admin -p -h localhost -P 8889 --default-character-set=utf8mb4 < scripts/init-db.sql

CREATE DATABASE IF NOT EXISTS dashboard
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dashboard;

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ═══════════════════════════════════════════════════════
-- Drop existing tables (reverse FK order)
-- ═══════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS ideas;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS recurring_tasks;
DROP TABLE IF EXISTS standalone_tasks;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS lead_product_types;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS product_types;
DROP TABLE IF EXISTS stores;
DROP TABLE IF EXISTS channel_tasks;
DROP TABLE IF EXISTS channels;
DROP TABLE IF EXISTS project_tasks;
DROP TABLE IF EXISTS stages;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS employee_schedule;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS goals;
DROP TABLE IF EXISTS departments;
SET FOREIGN_KEY_CHECKS = 1;

-- ═══════════════════════════════════════════════════════
-- Departments
-- ═══════════════════════════════════════════════════════

CREATE TABLE departments (
  id          VARCHAR(20)  PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  person      VARCHAR(100) NOT NULL,
  color       VARCHAR(20)  NOT NULL,
  icon        VARCHAR(10)  NOT NULL,
  description TEXT         NOT NULL
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════
-- Goals (belong to department)
-- ═══════════════════════════════════════════════════════

CREATE TABLE goals (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  text          VARCHAR(500) NOT NULL,
  progress      INT          NOT NULL DEFAULT 0,
  kpi           VARCHAR(100) NOT NULL DEFAULT '',
  department_id VARCHAR(20)  NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════
-- Tasks (department tasks)
-- ═══════════════════════════════════════════════════════

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
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════
-- Employees
-- ═══════════════════════════════════════════════════════

CREATE TABLE employees (
  name          VARCHAR(100) PRIMARY KEY,
  department_id VARCHAR(20)  NOT NULL,
  roles         JSON         NOT NULL,
  color         VARCHAR(20)  NOT NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE employee_schedule (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  employee_name VARCHAR(100)                     NOT NULL,
  date          DATE                             NOT NULL,
  type          ENUM('work','dayoff','vacation') NOT NULL,
  FOREIGN KEY (employee_name) REFERENCES employees(name) ON DELETE CASCADE,
  UNIQUE KEY unique_emp_date (employee_name, date)
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════
-- Projects
-- ═══════════════════════════════════════════════════════

CREATE TABLE projects (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  goal        TEXT         NOT NULL,
  description TEXT         NOT NULL,
  deadline    DATE         NOT NULL,
  priority    BIGINT       NOT NULL DEFAULT 0,
  responsible VARCHAR(100) NULL
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════
-- Stages
-- ═══════════════════════════════════════════════════════

CREATE TABLE stages (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  result      TEXT         NOT NULL,
  description TEXT         NOT NULL,
  deadline    DATE         NOT NULL,
  project_id  BIGINT       NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════
-- Project Tasks
-- ═══════════════════════════════════════════════════════

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
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════
-- Channels
-- ═══════════════════════════════════════════════════════

CREATE TABLE channels (
  id      BIGINT AUTO_INCREMENT PRIMARY KEY,
  name    VARCHAR(200) NOT NULL,
  `group` ENUM('loyalty','digital','offline') NOT NULL
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════
-- Channel Tasks
-- ═══════════════════════════════════════════════════════

CREATE TABLE channel_tasks (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  text       VARCHAR(500) NOT NULL,
  done       BOOLEAN      NOT NULL DEFAULT FALSE,
  deadline   DATE         NULL,
  channel_id BIGINT       NOT NULL,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════
-- Stores (торговые точки)
-- ═══════════════════════════════════════════════════════

CREATE TABLE stores (
  id   BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  tbu  INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════
-- Product Types (типы товаров)
-- ═══════════════════════════════════════════════════════

CREATE TABLE product_types (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  category   ENUM('doors','windows','floors','other') NOT NULL DEFAULT 'other',
  avg_check  INT NOT NULL DEFAULT 0,
  avg_markup INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════
-- Leads
-- ═══════════════════════════════════════════════════════

CREATE TABLE leads (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(200)                              NOT NULL,
  channel_id     BIGINT                                    NULL,
  contact_method ENUM('salon','phone','social','old_request') NOT NULL,
  result         ENUM('measurement','sale','deferred')     NOT NULL,
  date           DATE                                      NOT NULL,
  note           TEXT                                      NULL,
  store_id       BIGINT                                    NULL,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════
-- Lead ↔ Product Types (many-to-many)
-- ═══════════════════════════════════════════════════════

CREATE TABLE lead_product_types (
  lead_id         BIGINT NOT NULL,
  product_type_id BIGINT NOT NULL,
  PRIMARY KEY (lead_id, product_type_id),
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (product_type_id) REFERENCES product_types(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════
-- Expenses
-- ═══════════════════════════════════════════════════════

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
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════
-- Standalone Tasks
-- ═══════════════════════════════════════════════════════

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
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════
-- Recurring Tasks
-- ═══════════════════════════════════════════════════════

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
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════
-- Settings
-- ═══════════════════════════════════════════════════════

CREATE TABLE settings (
  `key`   VARCHAR(100) PRIMARY KEY,
  `value` TEXT         NOT NULL
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════
-- Users
-- ═══════════════════════════════════════════════════════

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  employee_name VARCHAR(100) NULL,
  role          ENUM('admin','manager','viewer') NOT NULL DEFAULT 'viewer',
  FOREIGN KEY (employee_name) REFERENCES employees(name) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ═══════════════════════════════════════════════════════
-- Posts (content management)
-- ═══════════════════════════════════════════════════════

CREATE TABLE posts (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  title     VARCHAR(300)  NOT NULL,
  text      TEXT          NOT NULL,
  topic     VARCHAR(200)  NOT NULL DEFAULT '',
  product   ENUM('windows','balconies','entrance_doors','interior_doors','flooring','other') NOT NULL DEFAULT 'other',
  status    ENUM('proposed','approved') NOT NULL DEFAULT 'proposed',
  photo_url VARCHAR(500)  NULL,
  date      DATE          NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════
-- Ideas (content ideas)
-- ═══════════════════════════════════════════════════════

CREATE TABLE ideas (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(300)  NOT NULL,
  description TEXT          NOT NULL,
  status      ENUM('new','in_progress','approved','rejected') NOT NULL DEFAULT 'new',
  date        DATE          NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════

-- Departments
INSERT INTO departments (id, name, person, color, icon, description) VALUES
  ('management', 'Руководство / Маркетинг', 'Никита', '#6366f1', '👑', 'Анализ, стратегия, УТП, планы, управление'),
  ('ads', 'Рекламный менеджмент', 'Диана', '#ec4899', '📢', 'Рекламные каналы, кампании, рутинные задачи'),
  ('content', 'Фабрика контента', 'Дима', '#10b981', '🎨', 'Контент, имидж компании, соц. сети'),
  ('tech', 'Технический отдел', 'Никита', '#f59e0b', '⚙️', 'Технологии, автоматизация, IT-решения');

-- Goals (globally unique IDs)
INSERT INTO goals (id, text, progress, kpi, department_id) VALUES
  (1, 'Увеличить количество лидов на 30% к Q3', 45, 'Лиды/мес', 'management'),
  (2, 'Разработать маркетинговую стратегию на H2 2026', 20, 'Документ', 'management'),
  (3, 'Сформировать 3 новых УТП для основных продуктов', 60, 'УТП', 'management'),
  (4, 'Снизить CPL на 15% по всем каналам', 30, 'CPL, ₽', 'ads'),
  (5, 'Запустить рекламу в 2 новых каналах', 50, 'Каналы', 'ads'),
  (6, 'Достичь CTR > 3% в контекстной рекламе', 70, 'CTR, %', 'ads'),
  (7, 'Публиковать 20+ постов в месяц по всем соцсетям', 65, 'Посты/мес', 'content'),
  (8, 'Увеличить вовлечённость (ER) до 5%', 40, 'ER, %', 'content'),
  (9, 'Создать фирменный гайдлайн по контенту', 10, 'Документ', 'content'),
  (10, 'Автоматизировать 5 рутинных процессов', 40, 'Процессы', 'tech'),
  (11, 'Внедрить CRM-аналитику для маркетинга', 25, 'Система', 'tech'),
  (12, 'Сократить время на рутину на 20%', 35, 'Часы/нед', 'tech');

-- Tasks (department tasks, globally unique IDs)
INSERT INTO tasks (id, text, status, priority, due_date, start_date, due_time, duration, department_id) VALUES
  (1, 'Провести анализ конкурентов', 'done', 'high', '2026-02-10', '2026-02-03', '10:00', 120, 'management'),
  (2, 'Составить квартальный план', 'in_progress', 'high', '2026-02-28', '2026-02-17', '09:00', 180, 'management'),
  (3, 'Подготовить отчёт по ROI рекламных каналов', 'in_progress', 'medium', '2026-03-05', '2026-02-24', '14:00', 90, 'management'),
  (4, 'Утвердить акции на март', 'todo', 'medium', '2026-03-01', NULL, '11:00', 60, 'management'),
  (5, 'Провести стратегическую сессию с командой', 'todo', 'low', '2026-03-15', NULL, '15:00', 120, 'management'),
  (6, 'Настроить ретаргетинг в Яндекс.Директ', 'done', 'high', '2026-02-07', '2026-02-03', '11:00', 90, 'ads'),
  (7, 'Обновить креативы для VK Ads', 'in_progress', 'high', '2026-02-25', '2026-02-18', '10:00', 120, 'ads'),
  (8, 'Оптимизировать ставки в Google Ads', 'in_progress', 'medium', '2026-03-03', '2026-02-20', '13:00', 60, 'ads'),
  (9, 'Подготовить отчёт по рекламным расходам', 'todo', 'medium', '2026-03-10', NULL, '09:00', 120, 'ads'),
  (10, 'Тестировать новые аудитории в Telegram Ads', 'todo', 'low', '2026-03-20', NULL, '16:00', 90, 'ads'),
  (11, 'Написать 5 постов для Telegram-канала', 'done', 'high', '2026-02-12', '2026-02-08', '09:00', 150, 'content'),
  (12, 'Снять Reels для Instagram', 'in_progress', 'high', '2026-02-22', '2026-02-18', '12:00', 180, 'content'),
  (13, 'Подготовить контент-план на март', 'in_progress', 'medium', '2026-02-28', '2026-02-20', '14:00', 120, 'content'),
  (14, 'Обновить обложки в соцсетях', 'todo', 'low', '2026-03-08', NULL, '10:00', 90, 'content'),
  (15, 'Написать кейс по последнему проекту', 'todo', 'medium', '2026-03-12', NULL, '11:00', 180, 'content'),
  (16, 'Настроить автоотчёты в Google Analytics', 'done', 'high', '2026-02-14', '2026-02-05', '10:00', 120, 'tech'),
  (17, 'Интегрировать CRM с рекламными кабинетами', 'in_progress', 'high', '2026-03-01', '2026-02-15', '09:00', 240, 'tech'),
  (18, 'Исследовать AI-инструменты для контента', 'in_progress', 'medium', '2026-03-07', '2026-02-22', '15:00', 90, 'tech'),
  (19, 'Настроить UTM-генератор', 'todo', 'low', '2026-03-18', NULL, '13:00', 60, 'tech'),
  (20, 'Автоматизировать сбор данных по лидам', 'todo', 'high', '2026-02-28', NULL, '11:00', 150, 'tech');

-- Employees
INSERT INTO employees (name, department_id, roles, color) VALUES
  ('Никита', 'management', '["Руководитель", "Технический отдел"]', '#6366f1'),
  ('Диана', 'ads', '["Рекламный менеджер"]', '#ec4899'),
  ('Дима', 'content', '["Контент-менеджер"]', '#10b981');

-- Projects
INSERT INTO projects (id, name, goal, description, deadline, priority, responsible) VALUES
  (1, 'Запуск рекламной кампании Q2', 'Увеличить поток лидов на 30% через новые каналы', 'Комплексная кампания по запуску рекламы в новых каналах с A/B тестированием', '2026-06-30', 1, 'Диана'),
  (2, 'Редизайн контент-стратегии', 'Повысить вовлечённость до 5% ER', 'Пересмотр контент-плана, внедрение новых форматов и единого гайдлайна', '2026-04-30', 2, 'Дима'),
  (3, 'Внедрение CRM-аналитики', 'Автоматизировать сквозную аналитику маркетинга', 'Интеграция CRM с рекламными кабинетами и настройка дашбордов', '2026-05-31', 3, 'Никита');

-- Stages
INSERT INTO stages (id, name, result, description, deadline, project_id) VALUES
  (1, 'Подготовка', 'Утверждённая стратегия и креативы', 'Разработка стратегии, подготовка креативов и настройка аналитики', '2026-03-31', 1),
  (2, 'Запуск', 'Работающие кампании в 3 каналах', 'Запуск и первичная оптимизация рекламных кампаний', '2026-05-15', 1),
  (3, 'Анализ результатов', 'Отчёт по эффективности с рекомендациями', 'Сбор данных, анализ ROI, формирование отчёта', '2026-06-30', 1),
  (4, 'Аудит текущего контента', 'Отчёт с рекомендациями по улучшению', 'Анализ существующего контента и метрик', '2026-03-15', 2),
  (5, 'Разработка нового контент-плана', 'Утверждённый контент-план на Q2', 'Новая стратегия с акцентом на видео и Stories', '2026-04-15', 2),
  (6, 'Интеграция', 'Работающая связка CRM + рекламные кабинеты', 'Техническая интеграция систем', '2026-04-30', 3);

-- Project Tasks
INSERT INTO project_tasks (id, name, description, assignee, deadline, status, stage_id, project_id) VALUES
  (1, 'Провести анализ целевой аудитории', 'Сегментация ЦА для новых каналов', 'Никита', '2026-03-15', 'done', 1, 1),
  (2, 'Разработать креативы', '3 варианта баннеров + видео', 'Дима', '2026-03-25', 'in_progress', 1, 1),
  (3, 'Настроить UTM-метки', 'UTM для всех каналов', 'Никита', '2026-03-28', 'todo', 1, 1),
  (4, 'Запустить Яндекс.Директ', 'Контекстная реклама', 'Диана', '2026-04-10', 'todo', 2, 1),
  (5, 'Запустить VK Ads', 'Таргетированная реклама', 'Диана', '2026-04-20', 'todo', 2, 1),
  (6, 'Собрать данные по конверсиям', 'Агрегация данных из всех каналов', 'Никита', '2026-06-15', 'todo', 3, 1),
  (7, 'Собрать статистику по постам', 'ER, охваты, вовлечённость по каждому каналу', 'Дима', '2026-03-10', 'done', 4, 2),
  (8, 'Определить топ-форматы', 'Какие форматы работают лучше всего', 'Дима', '2026-03-15', 'in_progress', 4, 2),
  (9, 'Создать контент-план на апрель', '20+ постов с рубрикатором', 'Дима', '2026-04-01', 'todo', 5, 2),
  (10, 'Настроить API-коннекторы', 'Яндекс.Директ, VK, Google Ads', 'Никита', '2026-04-15', 'in_progress', 6, 3),
  (11, 'Тестировать передачу данных', 'Проверка корректности данных', 'Никита', '2026-04-25', 'todo', 6, 3);

-- Channels
INSERT INTO channels (id, name, `group`) VALUES
  (1, 'Фасад', 'offline'),
  (2, 'Расклейка', 'offline'),
  (3, 'РСЯ', 'digital'),
  (4, 'Вконтакте', 'digital'),
  (5, 'Телеграмм', 'digital'),
  (6, 'Одноклассники', 'digital'),
  (7, 'Сарафанное радио', 'loyalty'),
  (8, 'Постоянный клиент', 'loyalty'),
  (9, 'Обзвон', 'loyalty');

-- Leads
INSERT INTO leads (id, name, channel_id, contact_method, result, date, note) VALUES
  (1, 'Иванов Пётр', 3, 'phone', 'measurement', '2025-03-05', 'Квартира 45 м2'),
  (2, 'Смирнова Анна', 4, 'social', 'sale', '2025-03-07', 'Кухня под ключ'),
  (3, 'Козлов Дмитрий', 7, 'salon', 'measurement', '2025-03-10', NULL),
  (4, 'Фёдорова Елена', 1, 'salon', 'deferred', '2025-03-12', 'Вернётся через месяц'),
  (5, 'Николаев Артём', 9, 'phone', 'sale', '2025-03-15', NULL);

-- Expenses
INSERT INTO expenses (id, name, amount, responsible, date, project_id, channel_id) VALUES
  (1, 'Яндекс.Директ — бюджет март', 150000, 'Диана', '2026-03-01', 1, 3),
  (2, 'VK Ads — тестовый бюджет', 50000, 'Диана', '2026-03-05', 1, 4),
  (3, 'Дизайн баннеров (фриланс)', 25000, 'Дима', '2026-03-10', 1, NULL),
  (4, 'Подписка Figma (годовая)', 18000, 'Дима', '2026-02-15', 2, NULL),
  (5, 'Видеосъёмка Reels', 35000, 'Дима', '2026-03-12', 2, NULL),
  (6, 'Лицензия CRM-системы', 45000, 'Никита', '2026-02-20', 3, NULL),
  (7, 'Канцтовары для офиса', 3500, 'Никита', '2026-03-15', NULL, NULL);

-- Settings
INSERT INTO settings (`key`, `value`) VALUES
  ('averageCheck', '8000'),
  ('monthlyLeadPlan', '200'),
  ('dailyLeadPlan', '7'),
  ('monthlyBudget', '0'),
  ('taxCoefficient', '0.07');

-- Default admin user (password: admin123)
INSERT INTO users (username, password_hash, employee_name, role) VALUES
  ('admin', '$2b$10$0brt1kKju/sef3JWFSMqWejCiNe4WH8YY54SYqZ3ENnDraEjJrxG2', 'Никита', 'admin');
