import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Validate Supabase bucket env var
    if (!process.env.SUPABASE_BUCKET) {
      return NextResponse.json(
        { error: 'SUPABASE_BUCKET environment variable not configured' },
        { status: 500 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { path } = body

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "path" field in request body' },
        { status: 400 }
      )
    }

    // Validate path starts with "licences/"
    if (!path.startsWith('licences/')) {
      return NextResponse.json(
        { error: 'Invalid path: must start with "licences/"' },
        { status: 400 }
      )
    }

    // Generate 5-minute signed URL
    const { data, error } = await supabaseAdmin
      .storage
      .from(process.env.SUPABASE_BUCKET)
      .createSignedUrl(path, 300) // 300 seconds = 5 minutes

    if (error || !data?.signedUrl) {
      console.error('Signed URL error:', error)
      return NextResponse.json(
        { error: 'Failed to generate signed URL', details: error?.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      url: data.signedUrl
    })

  } catch (error: any) {
    console.error('Error generating signed URL:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate signed URL',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
