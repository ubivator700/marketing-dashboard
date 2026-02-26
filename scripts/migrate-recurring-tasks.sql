-- Migration: Add recurring_tasks table
-- Run this on the production database to add the recurring tasks feature

CREATE TABLE IF NOT EXISTS recurring_tasks (
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
