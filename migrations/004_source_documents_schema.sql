ALTER TABLE films ADD COLUMN IF NOT EXISTS source_documents JSONB DEFAULT '{}'::jsonb;
