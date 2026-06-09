export const PORTRAIT_TEXT_FIELDS = [
  'portrait_logline',
  'portrait_emotional_core',
  'portrait_story',
  'portrait_world',
  'portrait_subjects',
  'portrait_themes',
  'portrait_approach',
  'portrait_tone',
  'portrait_visual_world',
  'portrait_audience',
  'portrait_comparable_films',
  'portrait_target_length',
]

export function appendHistory(
  existingField: { value?: string; created_by?: string; updated_at?: string; history?: Array<{ previous_value: string; changed_by: string; changed_at: string }> } | null | undefined
): Array<{ previous_value: string; changed_by: string; changed_at: string }> {
  const existingHistory = existingField?.history ?? []
  if (!existingField?.value) return existingHistory
  return [
    ...existingHistory,
    {
      previous_value: existingField.value,
      changed_by: existingField.created_by ?? 'unknown',
      changed_at: existingField.updated_at ?? new Date().toISOString(),
    },
  ]
}


export function buildExtractionPrompt(existingMemoryBlock: string, now: string): string {
  return `You are reading a film script or treatment. Extract everything you can learn about this film and return it as a single JSON object with two keys: "memory" and "portrait".

${existingMemoryBlock}The "memory" object contains these five fields:
- emotional_core: The soul of the film — what it does to an audience emotionally, not a plot summary
- characters: Who the key people are and what they are becoming — the emotional truth of each person
- decisions_made: Any explicit creative choices visible in the script — form, structure, approach
- filmmakers_words: Exact phrases or sentences from the script that feel like the filmmaker's own voice — distinctive, specific language. Return as a pipe-separated string of individual phrases.
- unresolved_threads: What the film leaves open — unanswered questions, unresolved tensions

The "portrait" object contains these thirteen fields. Each field must follow this exact shape:
{ "value": "...", "created_by": "script_upload", "created_in_mode": "script_upload", "updated_at": "${now}" }

Portrait fields to extract:
- portrait_logline: One sentence. What the film is. Precise and specific.
- portrait_emotional_core: The soul of the film — the thematic question it asks, what it does to an audience
- portrait_story: The narrative arc — where it begins, where it turns, where it ends
- portrait_world: The physical, historical, and atmospheric environment the film inhabits
- portrait_subjects: The key people in the film and their significance
- portrait_themes: What the film argues beneath the surface story
- portrait_approach: How the film is being told — observation, testimony, reconstruction, argument, portrait, other
- portrait_tone: The emotional temperature — the feeling of being inside this film
- portrait_visual_world: Visual instincts — palette, light quality, camera relationship to subject
- portrait_audience: Who this film is for and where they will watch it
- portrait_unresolved_questions: An array of open questions this film has not yet answered. Use this shape: { "value": [{ "question": "...", "category": "Historical|Narrative|Strategic", "added_at": "${now}" }], "created_by": "script_upload", "created_in_mode": "script_upload", "updated_at": "${now}" }
- portrait_comparable_films: Films that share this film's tone, approach, or visual sensibility
- portrait_target_length: A specific number in minutes, if determinable from the script

Do not extract portrait_directors_intent. That field belongs to the filmmaker alone.

If you cannot determine a value for a field, omit that field from the portrait object entirely — do not return null or an empty string.

Return only the JSON object. No preamble, no explanation, no markdown formatting.`
}
