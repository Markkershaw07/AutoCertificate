import { NextRequest, NextResponse } from 'next/server'
import { createSheepCRMClient } from '@/lib/sheepcrm'
import { FormResponse } from '@/types/sheepcrm'
import { parseAssessorFormResponse } from '@/lib/parse-assessor-form'
import { analyzeAssessorApplication, formatAssessorReviewNote } from '@/lib/assessor-analysis'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * Analyze a Trainer/Assessor application with AI
 * POST /api/assessor-applications/[id]/analyze
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    // Construct the form response URI
    const formResponseUri = `/faib/form_response/${id}/`

    console.log('Analyzing application:', formResponseUri)

    // Fetch the form response from SheepCRM
    const sheepCRM = createSheepCRMClient()
    const formResponse = await sheepCRM.getFormResponse(formResponseUri) as FormResponse

    // Parse the application data
    const applicationData = parseAssessorFormResponse(formResponse)

    console.log('Parsed application data:', {
      applicant: applicationData.applicantName,
      requiredDocs: applicationData.attachments.required.length,
      additionalDocs: applicationData.attachments.additional.length
    })

    // Run AI analysis
    const analysis = await analyzeAssessorApplication(applicationData)

    // Format as review note
    const reviewNote = formatAssessorReviewNote(analysis)

    return NextResponse.json({
      success: true,
      data: {
        application: {
          uri: applicationData.formResponseUri,
          applicantName: applicationData.applicantName,
          submissionDate: applicationData.submissionDate
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
        reviewNote: {
          content: reviewNote,
          posted: false
        }
      }
    })

  } catch (error: any) {
    console.error('Analysis error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Analysis failed',
        details: error.message
      },
      { status: 500 }
    )
  }
}
