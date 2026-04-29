-- Migration 001: 14-Field Film Portrait Schema
-- Story 1.2 — April 2026
ALTER TABLE film_memory
  ADD COLUMN IF NOT EXISTS portrait_logline              JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portrait_emotional_core       JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portrait_story                JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portrait_world                JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portrait_subjects             JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portrait_themes               JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portrait_approach             JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portrait_tone                 JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portrait_visual_world         JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portrait_audience             JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portrait_directors_intent     JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portrait_unresolved_questions JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portrait_comparable_films     JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portrait_target_length        JSONB DEFAULT NULL;
