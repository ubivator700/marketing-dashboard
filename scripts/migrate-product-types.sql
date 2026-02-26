-- Migration: Add product_types table and link to leads
-- Run: /Applications/MAMP/Library/bin/mysql80/bin/mysql -u root -proot -P 8889 -h 127.0.0.1 dashboard < scripts/migrate-product-types.sql

USE dashboard;

CREATE TABLE IF NOT EXISTS product_types (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  category   ENUM('doors','windows','floors','other') NOT NULL DEFAULT 'other',
  avg_check  INT NOT NULL DEFAULT 0,
  avg_markup INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE leads ADD COLUMN product_type_id BIGINT NULL;
ALTER TABLE leads ADD CONSTRAINT fk_leads_product_type
  FOREIGN KEY (product_type_id) REFERENCES product_types(id) ON DELETE SET NULL;
