import { NextRequest, NextResponse } from 'next/server'
import { createSheepCRMClient } from '@/lib/sheepcrm'
import { SheepCRMWebhookPayload } from '@/types/sheepcrm'
import crypto from 'crypto'

export const runtime = 'nodejs'

/**
 * Verify webhook signature for security
 * SheepCRM should send a signature header to verify the webhook is authentic
 */
function verifyWebhookSignature(payload: string, signature: string | null): boolean {
  if (!process.env.SHEEPCRM_WEBHOOK_SECRET) {
    console.warn('SHEEPCRM_WEBHOOK_SECRET not set - skipping signature verification')
    return true // Allow in development
  }

  if (!signature) {
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.SHEEPCRM_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * SheepCRM Webhook Handler
 * Receives payment events and auto-generates certificates
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    const signature = request.headers.get('x-sheepcrm-signature')

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse webhook payload
    let payload: SheepCRMWebhookPayload
    try {
      payload = JSON.parse(rawBody)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    // Log the full payload so we can diagnose any field name issues in Vercel logs
    console.log('=== SHEEPCRM PAYMENT WEBHOOK RECEIVED ===')
    console.log('EVENT:', payload.event)
    console.log('TIMESTAMP:', payload.timestamp)
    console.log('FULL DATA:', JSON.stringify(payload.data, null, 2))
    console.log('==========================================')

    // Extract member URI - try every possible field name SheepCRM might use
    let memberUri = payload.data.member_uri ||
                    payload.data.member?.ref ||
                    payload.data.member?.uri ||
                    payload.data.membership_uri ||
                    payload.data.membership?.ref ||
                    payload.data.membership?.uri ||
                    payload.data.uri ||
                    payload.data.ref

    console.log('Extracted memberUri:', memberUri)

    if (memberUri && !memberUri.includes('/member/')) {
      console.warn('Received non-member URI:', memberUri, '- will use person/org lookup instead')
    }

    if (!memberUri) {
      console.error('=== MEMBER URI NOT FOUND - DIAGNOSIS INFO ===')
      console.error('Full payload:', JSON.stringify(payload, null, 2))
      console.error('Data keys received:', Object.keys(payload.data || {}))
      console.error('Check Vercel logs and update this handler with the correct field name.')
      console.error('=============================================')
      return NextResponse.json(
        {
          error: 'No member URI found in webhook payload.',
          hint: 'Check Vercel logs for the full payload to identify the correct field name.',
          data_keys_received: Object.keys(payload.data || {})
        },
        { status: 400 }
      )
    }

    console.log('Processing certificate for member URI:', memberUri)

    // Create SheepCRM client and fetch certificate data
    const sheepCRM = createSheepCRMClient()

    // Use the appropriate method based on URI type
    const isMemberUri = memberUri.includes('/member/')
    const certificateData = isMemberUri
      ? await sheepCRM.getCertificateDataFromMember(memberUri)
      : await sheepCRM.getCertificateData(memberUri)

    console.log('Fetched certificate data:', {
      company_name: certificateData.company_name,
      licence_number: certificateData.licence_number,
      dates: `${certificateData.membership_start_date} to ${certificateData.membership_end_date}`
    })

    // Call existing certificate generation endpoint
    // Get the base URL from the request headers
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`

    const generateResponse = await fetch(`${baseUrl}/api/generate-licence-and-save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(certificateData)
    })

    if (!generateResponse.ok) {
      const errorData = await generateResponse.json()
      throw new Error(`Certificate generation failed: ${errorData.error}`)
    }

    const result = await generateResponse.json()

    console.log('Certificate generated successfully:', {
      path: result.path,
      company_name: certificateData.company_name
    })

    // Return success response to SheepCRM
    return NextResponse.json({
      success: true,
      message: 'Certificate generated successfully',
      data: {
        company_name: certificateData.company_name,
        licence_number: certificateData.licence_number,
        storage_path: result.path
      }
    })

  } catch (error: any) {
    console.error('Webhook processing error:', error)

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: 'Webhook processing failed',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for webhook verification/testing
 * Some webhook systems send GET requests to verify the endpoint exists
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'SheepCRM webhook endpoint is active',
    status: 'ready'
  })
}
