-- Add documents_stale JSONB column to films table
-- Tracks which IN REVIEW gate documents have been flagged as stale by the conversation
ALTER TABLE films
  ADD COLUMN IF NOT EXISTS documents_stale JSONB DEFAULT '{}'::jsonb;
