import { NextRequest, NextResponse } from 'next/server'
import { createSheepCRMClient } from '@/lib/sheepcrm'
import { FormResponse } from '@/types/sheepcrm'
import { parseAssessorFormResponse } from '@/lib/parse-assessor-form'
import { analyzeAssessorApplication, formatAssessorReviewNote } from '@/lib/assessor-analysis'

export const runtime = 'nodejs'

interface AnalyzeRequest {
  formResponseUri: string
  postToSheepCRM?: boolean
}

/**
 * Manual Assessor Application Analysis API
 * Similar to Renewal Analyzer - accepts form response URI and optionally posts review
 * POST /api/assessor-applications/analyze-manual
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

    // Parse the application data
    const applicationData = parseAssessorFormResponse(formResponse)

    console.log('Parsed application data:', {
      applicant: applicationData.applicantName,
      status: applicationData.status,
      requiredDocs: applicationData.attachments.required.length,
      additionalDocs: applicationData.attachments.additional.length
    })

    // Run AI analysis
    const analysis = await analyzeAssessorApplication(applicationData)

    // Format as review note
    const reviewNote = formatAssessorReviewNote(analysis)

    // Optionally post to SheepCRM if requested
    let reviewPosted = false
    if (body.postToSheepCRM) {
      // Update the form response with internal comments
      const endpoint = `/api/v1${body.formResponseUri}`
      const payload = {
        overall_internal_comments: reviewNote
      }

      const response = await fetch(`${process.env.SHEEPCRM_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.SHEEPCRM_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`SheepCRM API Error (${response.status}): ${errorData.error || response.statusText}`)
      }

      reviewPosted = true
      console.log('Review posted successfully to', body.formResponseUri)
    }

    // Return comprehensive analysis results (matching Renewal Analyzer structure)
    return NextResponse.json({
      success: true,
      data: {
        applicant: {
          uri: applicationData.applicantUri,
          name: applicationData.applicantName
        },
        application: {
          uri: applicationData.formResponseUri,
          status: applicationData.status,
          submissionDate: applicationData.submissionDate,
          personalInfo: applicationData.personalInfo,
          qualifications: applicationData.qualifications,
          attachments: applicationData.attachments
        },
        analysis: {
          summary: analysis.summary,
          requiredDocuments: analysis.requiredDocuments,
          additionalDocuments: analysis.additionalDocuments,
          complianceIssues: analysis.complianceIssues,
          strengths: analysis.strengths,
          recommendation: analysis.recommendation,
          recommendationReason: analysis.recommendationReason
        },
        note: {
          content: reviewNote,
          posted: reviewPosted
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
