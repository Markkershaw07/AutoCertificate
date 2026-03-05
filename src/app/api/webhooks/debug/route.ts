import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Debug webhook endpoint - captures and logs everything SheepCRM sends
 * Use this to discover the exact payload format before configuring the real handler
 *
 * Point SheepCRM webhooks here first: /api/webhooks/debug
 * Then check Vercel logs to see the full payload
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Log every header
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })

  // Try to parse body as JSON
  let parsedBody: any = null
  try {
    parsedBody = JSON.parse(rawBody)
  } catch {
    parsedBody = rawBody
  }

  console.log('=== SHEEPCRM DEBUG WEBHOOK ===')
  console.log('HEADERS:', JSON.stringify(headers, null, 2))
  console.log('RAW BODY:', rawBody)
  console.log('PARSED BODY:', JSON.stringify(parsedBody, null, 2))
  console.log('=== END DEBUG WEBHOOK ===')

  // Always return 200 so SheepCRM doesn't retry
  return NextResponse.json({
    received: true,
    message: 'Debug endpoint - check Vercel logs for full payload',
    timestamp: new Date().toISOString()
  })
}

export async function GET() {
  return NextResponse.json({
    message: 'SheepCRM debug webhook endpoint is active',
    instructions: 'Send a POST request from SheepCRM and check Vercel logs'
  })
}
