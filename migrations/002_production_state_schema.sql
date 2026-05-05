-- Migration 002: Production State Schema
-- Story 3.1 — May 2026
ALTER TABLE films ADD COLUMN IF NOT EXISTS current_mode text DEFAULT NULL;
ALTER TABLE films ADD COLUMN IF NOT EXISTS gates_closed jsonb DEFAULT '[]'::jsonb;
