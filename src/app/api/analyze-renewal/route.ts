import { NextRequest, NextResponse } from 'next/server'
import { createSheepCRMClient } from '@/lib/sheepcrm'
import { FormResponse } from '@/types/sheepcrm'
import { parseRenewalFormResponse } from '@/lib/parse-renewal-form'
import { analyzeRenewalForm, formatAnalysisNote } from '@/lib/ai-analysis'
import { calculateRenewalPricing, formatPricingBreakdown } from '@/lib/renewal-pricing'

export const runtime = 'nodejs'

interface AnalyzeRequest {
  formResponseUri: string
  postToSheepCRM?: boolean
}

/**
 * Manual Renewal Form Analysis API
 * Allows manual analysis of form submissions with optional posting to SheepCRM
 */
export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json()

    if (!body.formResponseUri) {
      return NextResponse.json(
        { error: 'formResponseUri is required' },
        { status: 400 }
      )
    }

    console.log('Manual analysis requested for:', body.formResponseUri)

    // Create SheepCRM client and fetch form response
    const sheepCRM = createSheepCRMClient()
    const formResponse = await sheepCRM.getFormResponse(body.formResponseUri) as FormResponse

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

    // Analyze form with AI
    const analysis = await analyzeRenewalForm({
      certificatesIssued: renewalData.certificateCounts.total,
      numberOfTrainers: renewalData.numberOfTrainers,
      trainerNames: renewalData.trainerNames,
      formAnswers: renewalData.rawResponse,
      organizationName: renewalData.organizationName
    })

    // Format the complete note
    const noteContent = formatAnalysisNote(analysis, pricingBreakdown)

    // Optionally post to SheepCRM if requested
    let journalEntryUri = null
    if (body.postToSheepCRM) {
      const today = new Date().toISOString().split('T')[0]

      const journalEntry = await sheepCRM.createJournalNote(
        renewalData.organizationUri,
        `Renewal Form Submission - ${today}`,
        noteContent
      )

      journalEntryUri = journalEntry.uri
      console.log('Journal note created:', journalEntryUri)
    }

    // Return comprehensive analysis results
    return NextResponse.json({
      success: true,
      data: {
        organization: {
          uri: renewalData.organizationUri,
          name: renewalData.organizationName
        },
        contact: {
          uri: renewalData.contactUri,
          name: renewalData.contactName
        },
        certificates: {
          breakdown: renewalData.certificateCounts,
          total: renewalData.certificateCounts.total
        },
        trainers: {
          count: renewalData.numberOfTrainers,
          names: renewalData.trainerNames
        },
        pricing: {
          bracket: pricing.bracketDescription,
          membershipFee: {
            exVAT: pricing.membershipFeeExVAT,
            vat: pricing.membershipVAT,
            incVAT: pricing.membershipFeeIncVAT
          },
          trainerFee: {
            exVAT: pricing.trainerFeeExVAT,
            vat: pricing.trainerVAT,
            incVAT: pricing.trainerFeeIncVAT
          },
          total: {
            exVAT: pricing.totalExVAT,
            vat: pricing.totalVAT,
            incVAT: pricing.totalIncVAT
          }
        },
        analysis: {
          summary: analysis.summary,
          missingItems: analysis.missingItems,
          complianceIssues: analysis.complianceIssues,
          trainerDetails: analysis.trainerDetails
        },
        note: {
          content: noteContent,
          posted: body.postToSheepCRM || false,
          journalEntryUri: journalEntryUri
        }
      }
    })

  } catch (error: any) {
    console.error('Analysis error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Analysis failed',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
