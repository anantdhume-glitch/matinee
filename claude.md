# MATINEE — Claude Code Context

## What Matinee Is
Matinee is a filmmaker's AI companion. The conversation IS the product.
Matinee talks to the filmmaker throughout their entire creative journey,
building a living Film Memory through dialogue. It never makes creative
decisions on behalf of the filmmaker. The filmmaker is always the director.

## Tech Stack
- Frontend: Next.js (App Router) on Vercel
- Database + Auth: Supabase (project ID: abltsfcmnmnfetkdxyia)
- AI: Anthropic Claude API (model: claude-sonnet-4-20250514)
- GitHub: anantdhume-glitch/matinee
- Live URL: matinee-nu.vercel.app

## Supabase Tables
- films — one record per film, stores title, filmmaker ID, created_at
- film_memory — one record per film, stores Film Memory fields and Film Portrait
- messages — full conversation history per film

## Film Memory Structure (film_memory table)
Five fields extracted silently after every conversation exchange:
- emotional_core — soul of the film, thematic question, tone
- characters — JSONB, who the people are becoming
- decisions_made — choices made and what was set aside
- filmmakers_words — exact phrases, never paraphrased
- unresolved_threads — open questions still unresolved

## Critical Rules — Never Violate
- Film Memory extraction is ALWAYS silent. Never surface it to the filmmaker.
- Never use words: AI, model, prompt, generate, output, dashboard, user, workflow
- Use cinema language only: Film, Studio, Scene, Frame, Portrait, Archive, Cut
- Matinee asks one question at a time. Always.
- Only the filmmaker closes a gate. No automated process closes a gate.
- Field 11 (Director's Intent) is FILMMAKER ONLY — no team member writes it.

## Language Rules
- The product is called Matinee
- The filmmaker's workspace is called The Studio
- Films are Films — never Projects or Content
- Errors use cinema language — see Behavioral Spec

## Deploy Process
1. Make changes in Cursor
2. git add . && git commit -m "description" && git push origin main
3. Vercel auto-deploys from GitHub

## Current Build State
Phase 1 complete and live. Phase 2 in progress.

| Story | Name                           | Status                              |
|-------|--------------------------------|-------------------------------------|
| 1.1   | Film Memory Loop               | COMPLETE — deployed Apr 26          |
| 1.2   | 14-Field Film Portrait Schema  | COMPLETE — deployed Apr 30          |
| 2.1   | Field-Aware Extraction Prompts | NEXT — start here                   |
| 2.3   | Field History                  | COMPLETE — history[] appended to all portrait fields on write. portrait_unresolved_questions replacement bug fixed. LEGACY_FIELDS deleted. |
| 2.4   | Field 12 Special Handling      | COMPLETE — UnresolvedQuestion type updated with resolved/resolved_at fields. resolveQuestion function added. window attachment removed post-testing. |

## Film Portrait Schema
14 portrait columns on the film_memory table, all JSONB, all nullable.
Each holds a PortraitField object: { value, created_by, created_in_mode, updated_at }.
Exception: portrait_unresolved_questions holds a PortraitUnresolvedField
where value is an array of { question, category, added_at }.

Column names:
- portrait_logline
- portrait_emotional_core
- portrait_story
- portrait_world
- portrait_subjects
- portrait_themes
- portrait_approach
- portrait_tone
- portrait_visual_world
- portrait_audience
- portrait_directors_intent
- portrait_unresolved_questions
- portrait_comparable_films
- portrait_target_length

Migration file: migrations/001_film_portrait_schema.sql
TypeScript types: PortraitField, PortraitUnresolvedField, UnresolvedQuestion — defined in app/studio/[id]/page.tsx

Design system reference: Matinee_Design_System_v1.md — read this before making any UI decision.