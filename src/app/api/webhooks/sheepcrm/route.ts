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

    console.log('Received SheepCRM webhook:', {
      event: payload.event,
      timestamp: payload.timestamp,
      data_keys: Object.keys(payload.data || {})
    })

    // Extract member URI from payload
    // SheepCRM payment webhooks should include the member record
    // Try different possible field names
    let memberUri = payload.data.member_uri ||
                    payload.data.uri ||
                    payload.data.member?.uri ||
                    payload.data.member?.ref

    // If we got a person/organisation URI instead, log a warning
    if (memberUri && !memberUri.includes('/member/')) {
      console.warn('Received non-member URI:', memberUri)
      console.warn('Webhooks should provide member URIs. Attempting to continue anyway...')
    }

    if (!memberUri) {
      console.error('No member URI found in webhook payload. Payload:', JSON.stringify(payload.data, null, 2))
      return NextResponse.json(
        { error: 'No member URI found in webhook payload. Please check webhook configuration.' },
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
