import { NextRequest, NextResponse } from 'next/server'
import { createSheepCRMClient } from '@/lib/sheepcrm'
import { FormSubmissionWebhookPayload, FormResponse } from '@/types/sheepcrm'
import { parseRenewalFormResponse } from '@/lib/parse-renewal-form'
import { analyzeRenewalForm, formatAnalysisNote } from '@/lib/ai-analysis'
import { calculateRenewalPricing, formatPricingBreakdown } from '@/lib/renewal-pricing'
import crypto from 'crypto'

export const runtime = 'nodejs'

/**
 * Verify webhook signature for security
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
 * SheepCRM Form Submission Webhook Handler
 * Receives form submission events and auto-analyzes renewal forms
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
    let payload: FormSubmissionWebhookPayload
    try {
      payload = JSON.parse(rawBody)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    console.log('Received form submission webhook:', {
      event: payload.event,
      timestamp: payload.timestamp,
      data_keys: Object.keys(payload.data || {})
    })

    // Extract form_response URI from payload
    const formResponseUri = payload.data.form_response_uri ||
                           payload.data.uri ||
                           payload.data.form_ref

    if (!formResponseUri) {
      console.error('No form_response URI found in webhook payload')
      return NextResponse.json(
        { error: 'No form_response URI found in webhook payload' },
        { status: 400 }
      )
    }

    // Only process submitted forms
    const status = payload.data.status
    if (status && status !== 'submitted') {
      console.log(`Form status is "${status}", skipping processing`)
      return NextResponse.json({
        success: true,
        message: `Form status is "${status}", not processing`
      })
    }

    console.log('Processing renewal form:', formResponseUri)

    // Create SheepCRM client and fetch form response
    const sheepCRM = createSheepCRMClient()
    const formResponse = await sheepCRM.getFormResponse(formResponseUri) as FormResponse

    // Parse the renewal form data
    const renewalData = parseRenewalFormResponse(formResponse)

    console.log('Parsed renewal data:', {
      organization: renewalData.organizationName,
      certificates: renewalData.certificateCounts.total,
      trainers: renewalData.numberOfTrainers
    })

    // Calculate pricing
    const pricing = calculateRenewalPricing(
      renewalData.certificateCounts.total,
      renewalData.numberOfTrainers
    )

    const pricingBreakdown = formatPricingBreakdown(pricing)

    console.log('Calculated pricing:', {
      total: pricing.totalIncVAT,
      bracket: pricing.bracketDescription
    })

    // Analyze form with AI
    const analysis = await analyzeRenewalForm({
      certificatesIssued: renewalData.certificateCounts.total,
      numberOfTrainers: renewalData.numberOfTrainers,
      trainerNames: renewalData.trainerNames,
      formAnswers: renewalData.rawResponse,
      organizationName: renewalData.organizationName
    })

    console.log('AI analysis completed:', {
      missing_items: analysis.missingItems.length,
      compliance_issues: analysis.complianceIssues.length
    })

    // Format the complete note
    const noteContent = formatAnalysisNote(analysis, pricingBreakdown)

    // Get today's date for the subject
    const today = new Date().toISOString().split('T')[0]

    // Create journal note on the organization's profile
    const journalEntry = await sheepCRM.createJournalNote(
      renewalData.organizationUri,
      `Renewal Form Submission - ${today}`,
      noteContent
    )

    console.log('Journal note created successfully:', {
      organization: renewalData.organizationName,
      note_uri: journalEntry.uri
    })

    // Return success response to SheepCRM
    return NextResponse.json({
      success: true,
      message: 'Renewal form analyzed and note created successfully',
      data: {
        organization_name: renewalData.organizationName,
        certificates_issued: renewalData.certificateCounts.total,
        trainers: renewalData.numberOfTrainers,
        total_cost: pricing.totalIncVAT,
        journal_entry_uri: journalEntry.uri
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
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'SheepCRM form submission webhook endpoint is active',
    status: 'ready'
  })
}
