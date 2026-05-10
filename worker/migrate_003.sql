-- Migration 003: add supplier sheet, composition title/piece, performance tier, and additional set fields
-- Run: npx wrangler d1 execute ceolmhor-enquiries --remote --file=worker/migrate_003.sql

ALTER TABLE enquiries ADD COLUMN supplier_sheet    TEXT;
ALTER TABLE enquiries ADD COLUMN enquiry_comp_piece TEXT;
ALTER TABLE enquiries ADD COLUMN enquiry_comp_title TEXT;
ALTER TABLE enquiries ADD COLUMN enquiry_perf_tier  TEXT;
ALTER TABLE enquiries ADD COLUMN enquiry_add_set    TEXT;
