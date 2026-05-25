import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { sessionId, firstMessage } = await request.json()

    if (!sessionId || !firstMessage) {
      return NextResponse.json({ error: 'Missing sessionId or firstMessage' }, { status: 400 })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 30,
      messages: [{
        role: 'user',
        content: `Given this opening message from a filmmaker, generate a session title of 4–5 words maximum. Return only the title, nothing else: "${firstMessage}"`,
      }],
    })

    const title = (response.content[0] as { type: string; text: string }).text.trim()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabaseAdmin
      .from('sessions')
      .update({ title })
      .eq('id', sessionId)

    return NextResponse.json({ title })
  } catch {
    return NextResponse.json({ error: 'Auto-title failed' }, { status: 500 })
  }
}
