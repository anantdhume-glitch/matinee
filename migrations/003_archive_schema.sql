-- Migration 003: Archive Schema
-- Story 6.1 — May 2026
ALTER TABLE films ADD COLUMN IF NOT EXISTS documents_generated jsonb DEFAULT '[]'::jsonb;
ALTER TABLE films ADD COLUMN IF NOT EXISTS documents_content jsonb DEFAULT '{}'::jsonb;
