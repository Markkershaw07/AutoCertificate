import { NextRequest, NextResponse } from 'next/server'
import { createSheepCRMClient } from '@/lib/sheepcrm'
import { FormResponse } from '@/types/sheepcrm'
import { parseAssessorFormResponse } from '@/lib/parse-assessor-form'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * Get a single Trainer/Assessor application by ID
 * GET /api/assessor-applications/[id]
 */
export async function GET(
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

    console.log('Fetching application:', formResponseUri)

    // Fetch the form response from SheepCRM
    const sheepCRM = createSheepCRMClient()
    const formResponse = await sheepCRM.getFormResponse(formResponseUri) as FormResponse

    // Parse the application data
    const applicationData = parseAssessorFormResponse(formResponse)

    return NextResponse.json({
      success: true,
      application: applicationData
    })

  } catch (error: any) {
    console.error('Error fetching application:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch application',
        details: error.message
      },
      { status: 500 }
    )
  }
}
