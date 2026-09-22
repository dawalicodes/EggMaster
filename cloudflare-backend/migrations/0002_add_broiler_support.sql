-- Migration 0002: Add Broiler and Weight Support to Cloudflare D1
-- Run with: npx wrangler d1 migrations apply eggmaster_pro_db --local (or --remote)

ALTER TABLE batches ADD COLUMN flockType TEXT DEFAULT 'layer';
ALTER TABLE batches ADD COLUMN breed TEXT;
ALTER TABLE batches ADD COLUMN ageDaysAtAcquisition INTEGER;
ALTER TABLE batches ADD COLUMN targetWeightKg REAL;
ALTER TABLE batches ADD COLUMN targetAgeDays INTEGER;

ALTER TABLE dailyRecords ADD COLUMN feedConsumedKg REAL;
ALTER TABLE dailyRecords ADD COLUMN feedTypeUsed TEXT;
ALTER TABLE dailyRecords ADD COLUMN avgWeightKg REAL;
ALTER TABLE dailyRecords ADD COLUMN fcr REAL;

ALTER TABLE feedStock ADD COLUMN category TEXT;
ALTER TABLE feedStock ADD COLUMN feedCategory TEXT;

ALTER TABLE income ADD COLUMN batchId TEXT;
ALTER TABLE income ADD COLUMN weightKg REAL;
ALTER TABLE income ADD COLUMN totalWeightKg REAL;
ALTER TABLE income ADD COLUMN saleUnit TEXT;
