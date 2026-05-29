export const PORTRAIT_FIELD_LABELS: Record<string, string> = {
  portrait_logline:          'Logline',
  portrait_emotional_core:   'Emotional Core',
  portrait_story:            'Story',
  portrait_world:            'World',
  portrait_subjects:         'Subjects',
  portrait_themes:           'Themes',
  portrait_approach:         'Approach',
  portrait_tone:             'Tone',
  portrait_visual_world:     'Visual World',
  portrait_audience:         'Audience',
  portrait_comparable_films: 'Comparable Films',
  portrait_target_length:    'Target Length',
}

export const MODE_PORTRAIT_FIELDS: Record<string, string[]> = {
  producer: [
    'portrait_logline', 'portrait_emotional_core', 'portrait_story',
    'portrait_subjects', 'portrait_themes', 'portrait_approach',
    'portrait_comparable_films', 'portrait_audience', 'portrait_target_length',
    'portrait_unresolved_questions'
  ],
  director: [
    'portrait_emotional_core', 'portrait_story', 'portrait_world',
    'portrait_subjects', 'portrait_tone', 'portrait_visual_world',
    'portrait_approach', 'portrait_target_length', 'portrait_comparable_films',
    'portrait_unresolved_questions'
  ],
  narrator: [
    'portrait_logline', 'portrait_emotional_core', 'portrait_story',
    'portrait_subjects', 'portrait_themes', 'portrait_tone',
    'portrait_approach', 'portrait_target_length', 'portrait_unresolved_questions'
  ],
  cinematographer: [
    'portrait_tone', 'portrait_visual_world', 'portrait_world',
    'portrait_subjects', 'portrait_approach', 'portrait_comparable_films',
    'portrait_target_length'
  ],
  ai_specialist: [
    'portrait_tone', 'portrait_visual_world', 'portrait_comparable_films'
  ],
  editor: [
    'portrait_emotional_core', 'portrait_tone', 'portrait_approach',
    'portrait_audience', 'portrait_target_length', 'portrait_unresolved_questions'
  ],
}

export function buildPortraitBlock(portrait: Record<string, any> | null, mode: string | null = null): string {
  if (!portrait) return 'The portrait is not yet built. You are meeting the filmmaker for the first time.'

  const activeFields = mode && MODE_PORTRAIT_FIELDS[mode]
    ? MODE_PORTRAIT_FIELDS[mode]
    : Object.keys(PORTRAIT_FIELD_LABELS)

  const lines: string[] = []

  for (const key of activeFields) {
    if (key === 'portrait_unresolved_questions') continue
    const label = PORTRAIT_FIELD_LABELS[key]
    if (!label) continue
    const value = portrait[key]?.value
    if (value && typeof value === 'string' && value.trim()) {
      lines.push(`- ${label}: ${value}`)
    }
  }

  if (activeFields.includes('portrait_unresolved_questions')) {
    const uqField = portrait.portrait_unresolved_questions
    if (uqField?.value && Array.isArray(uqField.value)) {
      const open = uqField.value.filter((q: any) => !q.resolved)
      if (open.length > 0) {
        lines.push(`- Unresolved Questions: ${open.map((q: any) => q.question).join(' | ')}`)
      }
    }
  }

  if (lines.length === 0) return 'The portrait is not yet built. You are meeting the filmmaker for the first time.'

  return `FILM PORTRAIT:\n${lines.join('\n')}`
}

export function referenceDocumentsSection(block: string | undefined): string {
  if (!block) return ''
  return `\n## REFERENCE DOCUMENTS\n\nThe filmmaker has uploaded the following research material. Use it to inform your responses. Do not invent facts not present in these documents.\n\n${block}`
}
