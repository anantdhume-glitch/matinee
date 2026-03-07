import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')
  const code = url.searchParams.get('code')

  const params = new URLSearchParams()
  if (token_hash) params.set('token_hash', token_hash)
  if (type) params.set('type', type)
  if (code) params.set('code', code)

  return NextResponse.redirect(
    new URL(`/auth/set-password?${params.toString()}`, req.url)
  )
}