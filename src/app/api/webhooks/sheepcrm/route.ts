import { NextRequest, NextResponse } from 'next/server'
import {
  generateCertificateFromSheepUri,
  getRequestBaseUrl
} from '@/lib/sheepcrm-certificate'
import {
  claimWebhookProcessing,
  classifyWebhookPayload,
  completeWebhookProcessing,
  releaseWebhookProcessing,
  verifyWebhookSignature
} from '@/lib/sheepcrm-webhook'
import { SheepCRMWebhookPayload } from '@/types/sheepcrm'

export const runtime = 'nodejs'

/**
 * SheepCRM Webhook Handler
 * Receives payment events and auto-generates certificates
 */
export async function POST(request: NextRequest) {
  let activeDedupeKey: string | null = null

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

    console.log('=== SHEEPCRM PAYMENT WEBHOOK RECEIVED ===')
    console.log('EVENT:', payload.event)
    console.log('TIMESTAMP:', payload.timestamp)
    console.log('FULL DATA:', JSON.stringify(payload.data, null, 2))
    console.log('==========================================')

    const classification = classifyWebhookPayload(payload)

    console.log('Webhook classification:', classification)

    if (!classification.shouldProcess) {
      return NextResponse.json(
        {
          success: true,
          processed: false,
          reason: classification.reason,
          event: classification.eventName
        },
        { status: 200 }
      )
    }

    const uriToProcess = classification.memberUri || classification.fallbackUri

    if (!uriToProcess) {
      console.error('No member/contact URI found in paid webhook payload.')
      return NextResponse.json(
        {
          success: false,
          error: 'No member or contact URI found in paid webhook payload',
          event: classification.eventName,
          data_keys_received: Object.keys(payload.data || {})
        },
        { status: 400 }
      )
    }

    if (process.env.SHEEPCRM_WEBHOOK_CAPTURE_ONLY === 'true') {
      console.log('Capture-only mode enabled - skipping certificate generation.')
      return NextResponse.json({
        success: true,
        processed: false,
        capture_only: true,
        reason: 'Payload captured successfully; generation skipped by configuration',
        event: classification.eventName,
        uri: uriToProcess
      })
    }

    if (!classification.dedupeKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unable to derive webhook dedupe key from payload',
          event: classification.eventName
        },
        { status: 400 }
      )
    }

    activeDedupeKey = classification.dedupeKey
    const claim = await claimWebhookProcessing(classification.dedupeKey, {
      event: classification.eventName,
      payment_id: classification.paymentId,
      uri: uriToProcess
    })

    if (!claim.claimed) {
      return NextResponse.json({
        success: true,
        processed: false,
        duplicate: true,
        reason: 'Webhook already processed or currently processing',
        event: classification.eventName
      })
    }

    console.log('Processing certificate for URI:', uriToProcess)

    const baseUrl = await getRequestBaseUrl()
    const { certificateData, generated } = await generateCertificateFromSheepUri(uriToProcess, baseUrl)

    console.log('Fetched certificate data:', {
      company_name: certificateData.company_name,
      licence_number: certificateData.licence_number,
      dates: `${certificateData.membership_start_date} to ${certificateData.membership_end_date}`
    })

    await completeWebhookProcessing(classification.dedupeKey, {
      event: classification.eventName,
      payment_id: classification.paymentId,
      uri: uriToProcess,
      company_name: certificateData.company_name,
      licence_number: certificateData.licence_number,
      storage_path: generated.path
    })

    console.log('Certificate generated successfully:', {
      path: generated.path,
      company_name: certificateData.company_name
    })

    // Return success response to SheepCRM
    return NextResponse.json({
      success: true,
      message: 'Certificate generated successfully',
      data: {
        company_name: certificateData.company_name,
        licence_number: certificateData.licence_number,
        storage_path: generated.path
      }
    })

  } catch (error: any) {
    console.error('Webhook processing error:', error)

    if (activeDedupeKey) {
      await releaseWebhookProcessing(activeDedupeKey)
    }

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
