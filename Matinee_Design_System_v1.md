# MATINEE
## UX & Design System
*Version 1.1 · May 2026*
*The reference document for every interface decision in Matinee. Every screen, every component, every future feature is built against this.*

---

## Part 1 — The Visual Principle

Matinee should feel like walking into a darkened screening room — quiet, focused, cinematic. Not a dashboard. Not a tool. A studio.

Every design decision is governed by one question:

> *Does this feel like a studio where films are made, or like software where tasks are managed?*

Matinee's visual language is deliberate restraint. Dark background. A single accent colour — gold — used sparingly and with intention. Typography that knows the difference between a heading and a label. Space used as a design element, not a gap to fill.

---

## Part 2 — The Three-Column Architecture

Every screen in Matinee — now and for all future features — lives inside the same three-column structure. The columns never change. What is inside them changes.

```
┌─────────────────────┬──────────────────────────────────────┬──────────────────────┐
│   PRODUCTION        │         THE CONVERSATION             │   CONTEXT            │
│   COMPASS           │                                      │   PANEL              │
│   176px · permanent │         flex · permanent · sacred    │   220px · adaptive   │
└─────────────────────┴──────────────────────────────────────┴──────────────────────┘
```

### Column 1 — The Production Compass (Left · 176px · Permanent)

The filmmaker's navigational home. Always visible. Never hidden. Never toggled.

**What it contains:**
- MATINEE wordmark at the top
- Current film title below the wordmark (editable on click)
- Full mode list: Discovery through Editor
- Gate documents as sub-items under their owning mode
- Gate state indicators per document
- Upload Script action at the bottom

**Rules:**
- Width is fixed at 176px. It never changes.
- Adding new modes means extending the list downward. The column does not get wider.
- The active mode is always gold. Available modes are warm white. Gated modes are dimmed.
- Gate documents appear as indented sub-items beneath their mode, always visible — not collapsed.
- Gate states are always visible in the rail. The filmmaker never needs to open a separate panel to see pipeline status.

**Gate state display in the rail:**

| State | Label | Colour |
|---|---|---|
| Locked (approved) | `LOCKED` | Gold · `#C8A96E` |
| In Review | `IN REVIEW` | Amber · `#C8956E` |
| Revised (filmmaker pushed back with notes) | `REVISED` | Amber · `#C8956E` |
| Open (not yet produced) | `OPEN` | Dimmed · `#7A7670` |

REVISED is a distinct gate state. It means the document has been reviewed and the filmmaker has returned notes — it is not the same as OPEN, which means nothing has been produced yet. REVISED preserves the production history. The document exists; it is being reworked against specific feedback.

### Column 2 — The Conversation (Centre · Flex · Permanent · Sacred)

The conversation is the product. This column is never compromised, never replaced, never shared with another feature.

**What it contains:**
- Current mode label at the top (centre-aligned, mono, small)
- Conversation messages
- Speak input at the bottom

**Message display rules:**
- Matinee's messages: left-aligned, serif, 19–22px, warm white, line-height 1.75. This is the primary reading experience.
- Filmmaker's messages: right-aligned, serif italic, 14–16px, dimmed. These are in a supporting role.
- No avatars. No timestamps on individual messages. No chat bubbles with coloured backgrounds.

**Input rules:**
- Placeholder text: `Speak...` in serif italic, dimmed
- No send button visible by default. Arrow `→` appears on the right when the input has content.
- The input is the most important interactive element in the product. It must never feel like a search bar or a form field.

**What the centre column never does:**
- Never shows a dashboard, a grid, or a list of items as the primary view
- Never shows a form
- Never hosts panels, drawers, or overlays that compete with the conversation
- New features never replace this column — they appear in the Context Panel (right) or as messages within the conversation itself

### Column 3 — The Context Panel (Right · 220px · Mode-Aware)

The context panel shows what is most relevant to what the filmmaker is working on right now. It adapts per mode. Film Portrait is always available as a tab. The default tab changes based on mode.

**Rules:**
- New features add a tab to this panel. They do not create new panels, new buttons in the header, or new navigation items.
- Maximum 3 tabs per mode. If a mode needs more than 3 views, reconsider the information architecture before adding tabs.
- Film Portrait is always the final tab in every mode, as a fallback and reference.
- The panel can be closed entirely via the pull tab on its left edge, giving the conversation the full remaining width.

**Context Panel by mode:**

| Mode | Tab 1 (default) | Tab 2 | Tab 3 |
|---|---|---|---|
| Discovery | Film Portrait | — | — |
| Producer | Film Brief (draft) | Film Portrait | Performance Data *(future)* |
| Director | Treatment (draft) | Dept. Briefs | Film Portrait |
| Historian *(future)* | Research Index | Verification Status | Film Portrait |
| Narrator | Script Segments | Film Portrait | — |
| Cinematographer | Shot List | Consistency Lock | Film Portrait |
| AI Specialist | Generated Images | Vision Check *(future)* | Generation Pack *(future)* |
| Editor | Edit Plan | Music Cue Sheet | Film Portrait |

---

## Part 3 — Colour System

Nine tokens. Each has a specific purpose and is not used outside that purpose.

| Token | Hex | Purpose |
|---|---|---|
| `--bg` | `#09090B` | Page background. The deepest level. Never used for UI surfaces. |
| `--bg-subtle` | `#111113` | Secondary background. Left rail, right panel. |
| `--surface` | `#16161A` | Cards, inputs, path selection cards, any elevated surface. |
| `--border` | `#2A2A30` | All borders and dividers. Subtle. Never decorative. |
| `--text` | `#E8E2D9` | Primary text. Warm off-white. Never pure white. |
| `--text-dim` | `#7A7670` | Secondary text. Labels, metadata, gated modes, placeholder text. |
| `--gold` | `#C8A96E` | The single accent. Wordmark, active mode, locked gates, primary actions. |
| `--gold-dim` | `#6B5A38` | Gold at rest. Borders on gold-accent elements. |
| `--amber` | `#C8956E` | Gate states only. IN REVIEW and REVISED. Used nowhere else. |

**Colour rules:**
- Gold appears maximum twice on any screen at the same time. If gold appears more, the screen is wrong.
- No pure black (`#000000`) or pure white (`#FFFFFF`) anywhere in the product.
- No additional colours without a specific, documented reason. The palette is complete.
- Backgrounds layer strictly: `--bg` → `--bg-subtle` → `--surface`. Never skip levels.
- Never use colour alone to convey information. Every colour state must also be expressed in a text label.

---

## Part 4 — Typography

Two typefaces. One role each. They do not cross over.

### Display & Conversation — Cormorant Garamond

Used for: the MATINEE wordmark, film titles, all of Matinee's conversation text, filmmaker's messages, Film Portrait field values, path selection questions, any text that carries meaning or emotion.

| Use | Size | Weight | Style |
|---|---|---|---|
| Wordmark | 24px | 500 | Uppercase · tracked |
| Film title (header) | 16px | 400 | Italic |
| Matinee conversation | 19–22px | 400 | Regular · line-height 1.75 |
| Filmmaker message | 14–16px | 300 | Italic |
| Film list title (named) | 19px | 400 | Regular |
| Film list title (untitled) | 17px | 400 | Italic · dimmed |
| Path selection question | 26–28px | 400 | Regular |
| Portrait field value | 14px | 400 | Regular · line-height 1.7 |
| Portrait field empty state | 13px | 400 | Italic · dimmed |

### UI & Metadata — DM Mono

Used for: all labels, mode names, gate states, dates, section headings, button text, placeholder text, status indicators, any text that describes the interface rather than the film.

| Use | Size | Weight | Tracking |
|---|---|---|---|
| Mode name (rail) | 9px | 400 | 0.14em |
| Gate state label | 9px | 400 | 0.08em |
| Section heading | 9–10px | 400 | 0.18–0.2em |
| Button text | 10–11px | 400 | 0.2em |
| Date / metadata | 9px | 300 | 0.08em |
| Input placeholder | Inherits serif | — | — |
| Tab label | 9px | 400 | 0.1em |

**Typography rules:**
- Serif is for the film. Mono is for the interface. They never swap roles.
- Minimum text size is 9px across the product. The sole exception is uppercase tracked DM Mono used as a status badge inside a bordered component, where 8px is acceptable only when letter-spacing is 0.08em or greater.
- All UI labels are uppercase. All film content is sentence case or the filmmaker's own capitalisation.
- No bold weight in the interface. Hierarchy is achieved through size, colour, and opacity — not weight.

---

## Part 5 — Screen-by-Screen Specifications

### Screen 1 — Login

**Layout:** Fully centred. Single column. 300px wide content block.

**Components:**
- MATINEE wordmark: Cormorant Garamond 500, 24px, letter-spacing 0.4em, gold, uppercase
- Tagline: DM Mono, 10px, letter-spacing 0.1em, `--text-dim`, uppercase. Text: *The filmmaker is always the director.*
- Email input: dark-surfaced (`--surface`), border `--border`, DM Mono 12px, `--text`. No bottom border (inputs stack).
- Password input: same styling, restores bottom border.
- Input focus state: border-color changes to `--gold-dim`. Background shifts to `#1C1C21`.
- CTA button: full width, transparent background, border `--gold-dim`, text `--gold`, DM Mono 10px, letter-spacing 0.2em, uppercase. Text: *Return to the Studio*
- Sub-link: DM Mono 10px, `--text-dim`. Text: *First time here? Create an account.*

**Rules:**
- No logo other than the wordmark. No illustration. No background texture.
- The three-column layout does not appear on this screen. Login is pre-studio.

---

### Screen 2 — The Studio (Film List)

**Layout:** Full page. Two-row layout: header strip + scrollable body.

**Header strip:**
- MATINEE wordmark: left, Cormorant Garamond 500, 15px, gold
- LEAVE: right, DM Mono 9px, `--text-dim`, uppercase
- Border bottom: `--border`

**Body:**
- Section label: DM Mono 9px, letter-spacing 0.2em, `--text-dim`, uppercase. Text: *The Studio*
- Film list: full width, border-top `--border`

**Film row:**
- Left: film title + stage label
- Right: date
- Border bottom: `--border`
- On hover: gold left border (2px, positioned outside the row's left edge)
- Named film title: Cormorant Garamond 19px, `--text`
- Untitled film title: Cormorant Garamond 17px italic, `--text-dim`
- Stage label: DM Mono 9px, `--text-dim`. The mode name within the stage label is gold.
- Date: DM Mono 9px, `--text-dim`

**Begin a new film:**
- Not a card. Not in the grid. A standalone text action below the film list.
- Format: `+` in gold + DM Mono label in `--text-dim`
- On click: opens a centred name input (modal or inline — not a bottom strip)

**Most recently opened film — hero treatment:**
- The most recently opened film receives a full-width hero row at the top of the list.
- Hero row shows: film title at 22px, the mode it is currently in, gate status, and a one-line peek at the last conversation message in Cormorant Garamond italic, `--text-dim`.
- The peek line shows the last thing Matinee said — not the filmmaker's message. It is a thread to pull.
- Gold 2px left border at rest. No hover required.
- All other films render as standard rows below the hero.

**Rules:**
- No grid. Films are always a list.
- Named films and untitled films are visually distinct without being labelled as such.
- "Begin a new film" is categorically different from a film card. It must never look like a film.
- The most recently opened film may carry a 2px gold left border at rest to indicate recency.

---

### Screen 3 — Path Selection (New Film)

**Layout:** Fully centred. Film title pinned to top-centre.

**Components:**
- Film title: top-centre, Cormorant Garamond 13px italic, `--text-dim`
- Question: Cormorant Garamond 26–28px, `--text`, centred
- Sub-label: DM Mono 9px, letter-spacing 0.12em, `--text-dim`, uppercase, centred. Text: *How you arrive shapes how we begin.*
- Two path cards: 380px wide, stacked, 10px gap
- Cancel link: DM Mono 9px, `--text-dim`, below the cards

**Path card:**
- Background: `--surface`
- Border: `--border`
- Padding: 20–22px 26–28px
- Card title: Cormorant Garamond 19–20px, `--gold`
- Card description: DM Mono 9px, `--text-dim`, uppercase, line-height 1.5
- On hover: border changes to `--gold-dim`, background shifts to `#1A1A1F`

**Rules:**
- Film title is always centred. Never top-right.
- No header strip on this screen. No three-column layout. This is a moment of arrival.

---

### Screen 4 — First Session (New Film, No Conversation Yet)

**Layout:** Three-column. Left rail visible. Context panel hidden (portrait pull tab visible only).

**Left rail state:**
- MATINEE wordmark in gold
- Film title in italic, dimmed
- DISCOVERY: gold, active
- All other modes: `--text-dim`, gated state labels visible
- Gate documents not shown (nothing has been produced yet)
- Upload Script visible at bottom

**Centre column state:**
- Mode label: `DISCOVERY` in DM Mono 9px, `--text-dim`, centred
- Single opening message from Matinee: Cormorant Garamond 19–22px, `--text`
- Speak input at bottom

**Right column state:**
- Context panel closed. Pull tab visible on right edge.
- Tab label reads `PORTRAIT` vertically, DM Mono 8px, `--text-dim`

**Rules:**
- No UPLOAD SCRIPT, FILM PORTRAIT, or ARCHIVE buttons in the header. These elements do not exist in the header at any point in the redesigned product.
- The header contains only the current mode label. Nothing else.
- The context panel does not open automatically on first session. The filmmaker opens it deliberately.

---

### Screen 5 — Studio Active (Conversation in Progress)

**Layout:** Full three-column layout.

**Left rail state:**
- Shows all modes with current gate states
- Active mode: gold, with subtle gold-tinted background (`rgba(200,169,110,0.07)`)
- Available modes (prerequisites met): `--text`, normal
- Gated modes (prerequisites not met): `--text-dim`, with gating reason in smaller mono text below
- Gate documents visible as indented sub-items with status badges

**Centre column state:**
- Mode label centred at top
- Conversation history
- Input at bottom

**Empty conversation state — any mode, any point in the project:**
When a filmmaker switches into a mode for the first time — whether on a new film or mid-project — the centre column shows a single opening line from that persona. No history. No prompt. No instruction list. Just presence. The persona speaks once, from what it knows about the film. Then it waits.

This applies to every mode without exception. The empty state is never a blank screen, never a list of capabilities, and never an instruction to complete a prerequisite. The persona meets the filmmaker where they are.

**Right column state (open):**
- Tabs for the current mode (see Part 2 context panel table)
- Default tab is the primary working document for the mode
- Film Portrait always available as a tab

**Focus Mode:**
When a filmmaker needs to read a full document — a complete treatment, a full script, a generated image at full size — the centre column expands temporarily to fill the screen minus the left rail. The right panel closes. A single `×` or `ESC` returns to the three-column layout.

Focus Mode is triggered by: clicking a document title in the context panel, a Matinee-generated link within the conversation, or a keyboard shortcut.

---

## Part 6 — Component Library

### The Rail Mode Item

```
[mode name]              ← DM Mono 9px · 0.14em tracking · uppercase
[gate state or reason]   ← DM Mono 8px · 0.07em tracking · dimmed · optional
```

States:
- **Active:** gold name, `rgba(200,169,110,0.07)` background
- **Available:** `--text` name, no background
- **Gated:** `--text-dim` name, gating reason below in smaller text

### The Gate Document Item (in rail, under its mode)

```
  [document name]    [STATUS]
```

- Indented 10–12px from mode item
- Document name: DM Mono 8px, `--text-dim`
- Status badge: DM Mono 7px, bordered, coloured per state

### The Context Panel Tab

- DM Mono 8px, letter-spacing 0.1em, uppercase
- Active tab: `--gold`, subtle gold background
- Inactive tab: `--text-dim`, no background
- Border bottom separates tabs from content

### The Film Portrait Field (in context panel)

```
[FIELD LABEL]    ← DM Mono 8px · gold · 0.14em tracking · uppercase · 0.8 opacity
[Field value]    ← Cormorant Garamond 13–14px · --text · line-height 1.7
```

Empty state: Cormorant Garamond 12–13px italic, `--text-dim`. Shows Matinee's guiding question for that field — not a blank, not a placeholder, not "Not yet filled."

### The Path Selection Card

- Background: `--surface`
- Border: 1px solid `--border`
- No border radius (sharp corners throughout the product)
- Card title: gold serif
- Description: dimmed mono uppercase
- Hover: border `--gold-dim`, background slightly lighter

### The Speak Input

- Full width of centre column minus padding
- No border. No background. Transparent.
- Placeholder: Cormorant Garamond italic, `--text-dim`. Text: `Speak...`
- Send indicator: `→` in DM Mono, appears right-aligned when input has content
- Line: `1px solid --border` above the input wrap only

### Primary Action Button (e.g. APPROVE gate)

- Background: transparent
- Border: 1px solid `--gold-dim`
- Text: DM Mono 10px, `--gold`, uppercase, letter-spacing 0.2em
- Hover: background `rgba(200,169,110,0.06)`, border `--gold`
- No border radius

### Secondary Action (e.g. REOPEN, IMPORT)

- Background: transparent
- Border: 1px solid `--border`
- Text: DM Mono 9px, `--text-dim`, uppercase
- Hover: border `rgba(200,169,110,0.3)`, text `--text`

---

## Part 7 — Interaction & Motion Principles

**Transitions:**
- Screen-to-screen: opacity fade, 400–500ms, ease
- Panel open/close: width transition, 280–300ms, ease
- Tab switches: opacity cross-fade, 150–200ms
- Mode switch: immediate, no transition. The conversation switches instantly.

**Hover states:**
- Film row: gold left border slides in, 200ms
- Mode item: background appears, 150ms
- Card: border and background shift, 200ms
- No scale transforms. No lift effects. No shadows appearing on hover.

**Rules:**
- No bounce, spring, or elastic easing anywhere in the product
- No animation that draws attention to itself. Motion serves orientation, not delight.
- If removing an animation would make the interface feel abrupt, add it. If removing it would make no difference, don't add it.

---

## Part 8 — Language Rules

Cinema language is locked. If a word would not feel right on a film poster, it does not belong in Matinee.

**Always use:**

| Instead of | Use |
|---|---|
| Dashboard | The Studio |
| Project | Film |
| Workspace | Studio |
| Settings | — (avoid as a concept where possible) |
| Submit | — (use the action itself: *Approve*, *Lock*, *Begin*) |
| Save | — (saving is invisible and automatic) |
| Upload | — (use *bring your script*, *let Matinee read it*) |
| Error | — (use *This frame didn't make it into the film. Try again.*) |
| Loading | *Setting the scene...* / *The film is listening.* |

**Button verb fallback:**
Cinema language is the default. When a verb must appear on a control and the cinema phrasing is too long to fit, use the closest cinema verb — never a generic SaaS verb. The fallback hierarchy is: cinema verb → compressed cinema verb → action noun. Examples: *Bring it in* (not Upload), *Lock it* (not Save), *Begin* (not Start), *Approve* (not Submit). If none of these fit, the button label is wrong — redesign the control before relaxing the language rule.

**System messages:**

| State | Matinee says |
|---|---|
| Gate closed | *Locked. Everything built from here carries this decision.* |
| Gate reopened | *Opened. What you find here may change what came after. That's the work.* |
| Gate revised | *Noted. The work continues — this time with more to go on.* |
| Portrait field updated | *The film just shifted. Everything built from this field is flagged for your review.* |
| Document produced, awaiting approval | *Ready when you are. This is a draft until you close it.* |
| Upload failed | *This frame didn't make it into the film. Try again — it's worth it.* |
| Session quiet | *The Studio has been quiet for a while. Your film is safe.* |

**Loading states — visual specification:**
Every loading moment in Matinee has two components: the copy (specified above) and a visual treatment. The visual treatment is always a slow opacity pulse — the text fades between 40% and 100% opacity on a 2.4 second cycle, ease-in-out. No spinner. No progress bar. No skeleton screen. The film is breathing, not processing.

---

## Part 9 — Rules for New Features

Every future feature must pass four checks before implementation begins.

**Check 1 — Which column does it live in?**
Every feature lives in exactly one column. If the answer is not immediately clear, the feature is not ready to be designed.
- Left rail: new modes only
- Centre: conversation-native features (image input, evaluation responses)
- Right panel: new tabs within existing modes

**Check 2 — Does it require cinema language?**
Name the feature, name its UI strings, name its empty states before writing a line of code. If any string uses SaaS vocabulary, rewrite it before proceeding.

**Check 3 — Does it serve the film or does it serve the interface?**
Features that make the interface more capable without making the film better do not belong in Matinee. Ask: does this help the filmmaker make a better film, or does it help Matinee look like a more complete product?

**Check 4 — Does it compromise the conversation?**
If implementing this feature requires the centre column to host anything other than the conversation, the implementation is wrong. Find another approach.

**On collaboration:**
Matinee v1 is a single-filmmaker tool. There is no co-director model. There are no shared gates, no multi-user permissions, no collaborative review flows. One film, one filmmaker, one director. This is a product position, not an omission. If this changes in a future version, the gate ownership model will need to be redesigned from the ground up.

**On tabs:**
Three tabs per mode is a hard ceiling, not a guideline. If a mode appears to need a fourth tab, the information architecture is wrong — not the rule. Reconsider what belongs in the context panel versus what belongs in the conversation or Focus Mode before adding a tab.

---

## Part 10 — Keyboard System

A filmmaker working deep in a session should never need the mouse for navigation. The full keyboard layer is specified here and must be implemented consistently across all modes.

| Action | Shortcut |
|---|---|
| Switch to Discovery | `⌘1` |
| Switch to Producer | `⌘2` |
| Switch to Director | `⌘3` |
| Switch to Narrator | `⌘4` |
| Switch to Cinematographer | `⌘5` |
| Switch to AI Specialist | `⌘6` |
| Switch to Editor | `⌘7` |
| Open / close context panel | `⌘\` |
| Enter Focus Mode | `F` |
| Exit Focus Mode | `ESC` |
| Jump to Speak input | `⌘K` |

**Rules:**
- Mode shortcuts switch the active mode immediately. If a mode is gated, the shortcut still works — the mode opens in conversation state, naming what it needs for production.
- `⌘K` focuses the Speak input from anywhere in the product. It never opens a command palette or search. It speaks.
- Keyboard shortcuts are never displayed in the UI. They are discovered through use. A filmmaker who finds them feels rewarded, not instructed.

---

## Part 11 — Version History

| Version | Date | Changes |
|---|---|---|
| v1.0 | May 2026 | Initial design system. Three-column architecture established. Full screen-by-screen specification. Component library. Interaction principles. Language rules. |
| v1.1 | May 2026 | Seven changes following external design critique. Added `--amber` token. Added REVISED gate state. Raised minimum text size to 9px with mono exception. Added empty conversation state specification for all modes. Added film list recency-first hero row. Added full keyboard system as Part 10. Added button verb fallback rule. Added loading visual specification. Stated collaboration position. Clarified 3-tab ceiling. Added REVISED system message. |

---

*MATINEE · The filmmaker is always the director.*
