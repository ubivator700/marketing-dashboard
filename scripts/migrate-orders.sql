-- Migration: Add employee position + design orders system
USE dashboard;

-- Add position column to employees
ALTER TABLE employees ADD COLUMN position VARCHAR(100) NULL DEFAULT NULL AFTER color;

-- Update existing employees with default position
UPDATE employees SET position = 'Маркетолог' WHERE position IS NULL;

-- Create design orders table
CREATE TABLE IF NOT EXISTS design_orders (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(500)  NOT NULL,
  description TEXT          NOT NULL DEFAULT '',
  author      VARCHAR(200)  NOT NULL,
  status      ENUM('new','accepted','rejected') NOT NULL DEFAULT 'new',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_by VARCHAR(100)  NULL,
  task_id     BIGINT        NULL,
  FOREIGN KEY (task_id) REFERENCES standalone_tasks(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Create design order attachments table
CREATE TABLE IF NOT EXISTS design_order_attachments (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id    BIGINT        NOT NULL,
  file_name   VARCHAR(500)  NOT NULL,
  file_path   VARCHAR(1000) NOT NULL,
  file_type   VARCHAR(100)  NOT NULL,
  file_size   BIGINT        NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES design_orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;
