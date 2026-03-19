-- Migration 001: add tier, delivery, and composition fields
-- Run: npx wrangler d1 execute ceolmhor-enquiries --remote --file=worker/migrate_001.sql

ALTER TABLE enquiries ADD COLUMN enquiry_tier      TEXT;
ALTER TABLE enquiries ADD COLUMN enquiry_delivery  TEXT;
ALTER TABLE enquiries ADD COLUMN enquiry_comp_type TEXT;
ALTER TABLE enquiries ADD COLUMN enquiry_comp_format TEXT;
