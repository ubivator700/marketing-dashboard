-- Migration: Switch from single product_type_id to many-to-many via junction table
-- Run: /usr/local/mysql/bin/mysql -h 127.0.0.1 -P 8889 -u admin -ptest1234 dashboard < scripts/migrate-lead-product-types.sql

USE dashboard;

-- 1. Create junction table
CREATE TABLE IF NOT EXISTS lead_product_types (
  lead_id         BIGINT NOT NULL,
  product_type_id BIGINT NOT NULL,
  PRIMARY KEY (lead_id, product_type_id),
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
  FOREIGN KEY (product_type_id) REFERENCES product_types(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Migrate existing data (if any leads have product_type_id set)
INSERT IGNORE INTO lead_product_types (lead_id, product_type_id)
SELECT id, product_type_id FROM leads WHERE product_type_id IS NOT NULL;

-- 3. Drop the old FK and column
ALTER TABLE leads DROP FOREIGN KEY fk_leads_product_type;
ALTER TABLE leads DROP COLUMN product_type_id;
