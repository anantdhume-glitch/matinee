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
Current task: Story 1.1 — Film Memory Loop.

## Story 1.1 — Film Memory Loop (CURRENT TASK)
Goal: Every exchange in every context feeds Film Memory continuously.
Extraction must READ existing Film Memory before WRITING new content.
New content synthesises with existing content — never appends blindly on top.
One unified extraction function — not two separate paths for script vs conversation.

Before writing any code, answer these four questions:
1. Where in the codebase does film_memory get written to Supabase?
   Find every location. There should be at most two.
2. What does the extraction prompt currently say?
   Does it include existing Film Memory content before generating new content?
3. Are script upload extraction and conversation extraction the same function
   or separate code paths?
4. When extraction writes to Supabase — does it merge field by field
   or overwrite the entire film_memory record?

Paste the answers before writing any code.