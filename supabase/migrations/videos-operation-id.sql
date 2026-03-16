-- Add operation_id column to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS operation_id text;
