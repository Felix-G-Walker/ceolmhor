-- Migration 002: add phone number field
-- Run: npx wrangler d1 execute ceolmhor-enquiries --remote --file=migrate_002.sql

ALTER TABLE enquiries ADD COLUMN phone TEXT;
