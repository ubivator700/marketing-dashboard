-- Migration: Add stores table and store_id columns to leads/expenses

CREATE TABLE IF NOT EXISTS stores (
  id   BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL
) ENGINE=InnoDB;

-- Add store_id to leads
ALTER TABLE leads ADD COLUMN store_id BIGINT NULL;
ALTER TABLE leads ADD CONSTRAINT fk_leads_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;

-- Add store_id to expenses
ALTER TABLE expenses ADD COLUMN store_id BIGINT NULL;
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;
