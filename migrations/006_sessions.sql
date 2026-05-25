-- =============================================================================
-- Migration 006 — Conversation Sessions
-- =============================================================================
-- Adds the sessions table and wires messages to sessions.
-- Existing messages are backfilled to a synthetic "Session 1" per film.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Existing messages table schema (version record — table created directly in
-- Supabase prior to this migration, not version-controlled until now)
--
--   id          uuid        primary key, default gen_random_uuid()
--   film_id     uuid        references films(id) on delete cascade
--   role        text        'user' | 'assistant'
--   content     text
--   created_at  timestamptz default now()
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- Step A — Create the sessions table
-- -----------------------------------------------------------------------------

create table sessions (
  id                uuid        primary key default gen_random_uuid(),
  film_id           uuid        references films(id) on delete cascade,
  created_at        timestamptz default now(),
  title             text,
  is_active         boolean     default true,
  mode_at_creation  text
);

alter table sessions enable row level security;

create policy "Users can manage their own sessions"
  on sessions for all
  using (
    film_id in (
      select id from films where user_id = auth.uid()
    )
  );


-- -----------------------------------------------------------------------------
-- Step B — Add session_id to messages
-- -----------------------------------------------------------------------------

alter table messages add column session_id uuid references sessions(id);


-- -----------------------------------------------------------------------------
-- Step C — Backfill existing messages
-- One synthetic session per film, marked inactive. The active session is
-- created fresh when the filmmaker next opens the film.
-- -----------------------------------------------------------------------------

insert into sessions (film_id, title, is_active, mode_at_creation)
select distinct film_id, 'Session 1', false, 'discovery'
from messages;

update messages m
set session_id = s.id
from sessions s
where m.film_id = s.film_id
  and m.session_id is null;
