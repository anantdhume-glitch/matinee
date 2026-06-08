import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const GATE_PORTRAIT_MAP: Record<string, string[]> = {
  film_brief:           ['portrait_logline', 'portrait_emotional_core', 'portrait_story', 'portrait_approach', 'portrait_audience', 'portrait_target_length', 'portrait_film_brief'],
  treatment:            ['portrait_story', 'portrait_tone', 'portrait_visual_world', 'portrait_approach', 'portrait_treatment'],
  narration_brief:      ['portrait_narration_brief'],
  cinematography_brief: ['portrait_visual_world', 'portrait_cinematography_brief'],
  sound_brief:          ['portrait_sound_brief'],
  ai_brief:             ['portrait_ai_brief'],
  editorial_brief:      ['portrait_editorial_brief'],
  script_lock:          ['portrait_story', 'portrait_tone', 'portrait_visual_world'],
}

const GATE_LABELS: Record<string, string> = {
  film_brief:           'Film Brief',
  treatment:            'Treatment',
  narration_brief:      'Narration Brief',
  cinematography_brief: 'Cinematography Brief',
  sound_brief:          'Sound Brief',
  ai_brief:             'AI Brief',
  editorial_brief:      'Editorial Brief',
  script_lock:          'Script Lock',
}

type ConfidenceDimension = 'strong' | 'developing' | 'needs_attention'

type ExtractionConfidence = {
  coverage: ConfidenceDimension
  clarity: ConfidenceDimension
  consistency: ConfidenceDimension
}

type ContinuityFlag = {
  flag: string
  source_a: string
  source_b: string
}

type ExtractionResult = {
  fields: Record<string, string | null>
  confidence: ExtractionConfidence
  continuity_flags: ContinuityFlag[]
}

export async function POST(req: NextRequest) {
  try {
    const { gateId, filmId, filmTitle, documentContent, filmMemory, sourceType } = await req.json()

    const targetFields = GATE_PORTRAIT_MAP[gateId]
    if (!targetFields) {
      return NextResponse.json({ success: true, fieldsWritten: [] })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const gateLabel = GATE_LABELS[gateId] ?? gateId

    // Build the existing portrait snapshot for the consistency check — only the fields this gate writes
    const existingPortraitSnapshot: Record<string, any> = {}
    for (const field of targetFields) {
      if (filmMemory?.[field]) existingPortraitSnapshot[field] = filmMemory[field]
    }

    const fieldList = targetFields.map(f => `    "${f}": "extracted value" | null`).join(',\n')

    const userPrompt = `APPROVED GATE DOCUMENT — ${gateLabel}

${documentContent}

---

EXISTING PORTRAIT (for consistency check):
${JSON.stringify(existingPortraitSnapshot, null, 2)}

---

Extract the committed decisions from this document. Return JSON in exactly this structure:

{
  "fields": {
${fieldList}
  },
  "confidence": {
    "coverage": "strong | developing | needs_attention",
    "clarity": "strong | developing | needs_attention",
    "consistency": "strong | developing | needs_attention"
  },
  "continuity_flags": [
    {
      "flag": "description of the contradiction or tension detected",
      "source_a": "this document — ${gateLabel}",
      "source_b": "existing portrait field — [field name]"
    }
  ]
}

Rules:
- Extract only what is explicitly stated. Never infer.
- If a field has no clear committed value in the document, set it to null.
- For the gate-specific summary fields (portrait_film_brief, portrait_treatment, portrait_narration_brief, portrait_cinematography_brief, portrait_sound_brief, portrait_ai_brief, portrait_editorial_brief): write a compact distillation of the key decisions from the document — 3 to 6 sentences maximum. This is not a summary of the prose — it is the decisions only.
- continuity_flags should only be populated when there is a genuine contradiction between this document and existing Portrait fields. An empty array is correct when there are no contradictions.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      temperature: 0,
      system: `You are Matinee's silent extraction engine. You read approved gate documents and extract committed creative decisions for the Film Portrait.

You extract only what is explicitly stated in the document. You never infer. You never fill in gaps. If a decision is not clearly stated, you leave the field null.

You also evaluate confidence across three dimensions:
- coverage: has the filmmaker addressed the decisions this gate is supposed to capture?
- clarity: where addressed, how unambiguous is the commitment?
- consistency: does this document align with the existing Portrait fields provided?

Each dimension is one of: "strong", "developing", "needs_attention"

You respond only with valid JSON. No preamble. No explanation. No markdown fences.`,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    let extraction: ExtractionResult
    try {
      extraction = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ success: false, error: 'extraction_parse_failed' }, { status: 500 })
    }

    const { fields, confidence, continuity_flags: extractedFlags } = extraction
    const now = new Date().toISOString()
    const fieldsWritten: string[] = []
    const portraitUpdate: Record<string, any> = {}

    for (const fieldName of targetFields) {
      const extractedValue = fields?.[fieldName]
      if (!extractedValue) continue

      const existingField = filmMemory?.[fieldName]
      const history = existingField?.value
        ? [
            ...(existingField.history ?? []),
            {
              previous_value: existingField.value,
              changed_by: existingField.created_by ?? 'unknown',
              changed_at: existingField.updated_at ?? now,
            },
          ]
        : []

      portraitUpdate[fieldName] = {
        value: extractedValue,
        created_by: 'matinee',
        created_in_mode: gateId,
        updated_at: now,
        source_type: sourceType ?? 'matinee_generated',
        approved_from_gate: gateId,
        confidence: {
          coverage: confidence.coverage,
          clarity: confidence.clarity,
          consistency: confidence.consistency,
          last_evaluated: now,
        },
        history,
      }
      fieldsWritten.push(fieldName)
    }

    if (fieldsWritten.length > 0) {
      await supabase.from('film_memory').update(portraitUpdate).eq('film_id', filmId)
    }

    // Update confidence on the gate record in films
    const { data: filmRow } = await supabase.from('films').select('gates_closed').eq('id', filmId).single()
    if (filmRow?.gates_closed) {
      const updatedGates = (filmRow.gates_closed as any[]).map((g: any) =>
        g.gate === gateId
          ? { ...g, confidence: { ...confidence, last_evaluated: now } }
          : g
      )
      await supabase.from('films').update({ gates_closed: updatedGates }).eq('id', filmId)
    }

    // Write continuity flags if any
    const newFlags = (extractedFlags ?? []).map((f: ContinuityFlag) => ({
      ...f,
      status: 'open',
      flagged_at: now,
      filmmaker_response: null,
    }))

    if (newFlags.length > 0) {
      const { data: currentMemory } = await supabase.from('film_memory').select('continuity_flags').eq('film_id', filmId).single()
      const existingFlags = (currentMemory?.continuity_flags as any[]) ?? []
      const updatedFlags = [...existingFlags, ...newFlags]
      await supabase.from('film_memory').update({ continuity_flags: updatedFlags }).eq('film_id', filmId)
    }

    // Write production log entries
    const logRows: any[] = fieldsWritten.map(fieldName => ({
      film_id: filmId,
      event_type: 'portrait_field_updated',
      event_detail: {
        field_name: fieldName,
        new_value: portraitUpdate[fieldName].value,
        approved_from_gate: gateId,
        source_type: sourceType ?? 'matinee_generated',
      },
      triggered_by: 'matinee',
      mode: gateId,
      session_id: null,
    }))

    logRows.push({
      film_id: filmId,
      event_type: 'memory_extraction_completed',
      event_detail: {
        pass_type: 'gate_approval',
        gate_id: gateId,
        fields_written: fieldsWritten,
      },
      triggered_by: 'matinee',
      mode: gateId,
      session_id: null,
    })

    if (logRows.length > 0) {
      await supabase.from('film_production_log').insert(logRows)
    }

    return NextResponse.json({
      success: true,
      fieldsWritten,
      confidence,
      continuityFlagsAdded: newFlags.length,
    })
  } catch (error) {
    console.error('gate-approval-extraction error:', error)
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 })
  }
}
