import { NextRequest, NextResponse } from 'next/server'
import { createSheepCRMClient } from '@/lib/sheepcrm'

export const runtime = 'nodejs'

/**
 * List Trainer/Assessor application form responses
 * GET /api/assessor-applications
 *
 * Query parameters:
 * - status: Filter by form status (submitted, accepted, rejected, etc.)
 * - limit: Number of results (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    const sheepCRM = createSheepCRMClient()

    // Fetch all form responses for the Trainer/Assessor application form
    const formUri = '/faib/form/66ab99d17039ceb319c18bde/'
    const endpoint = `/api/v1${formUri}responses/`

    console.log('Fetching assessor applications from:', endpoint)

    // Make request to SheepCRM
    const response = await fetch(`${process.env.SHEEPCRM_BASE_URL}${endpoint}?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${process.env.SHEEPCRM_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`SheepCRM API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Filter by status if specified
    let applications = data.results || data.form_responses || []

    if (statusFilter) {
      applications = applications.filter((app: any) =>
        app.data?.status === statusFilter
      )
    }

    // Format applications for frontend
    const formattedApplications = applications.map((app: any) => ({
      uri: app.uri,
      id: app.uri.split('/').filter((p: string) => p.length > 0).pop(),
      applicantName: app.data?.contact_ref?.display_value || 'Unknown',
      applicantUri: app.data?.contact_ref?.ref || '',
      submissionDate: app.data?.submission_date || null,
      status: app.data?.status || 'unknown',
      hasInternalComments: Boolean(app.data?.overall_internal_comments),
      hasFeedback: Boolean(app.data?.overall_feedback)
    }))

    return NextResponse.json({
      success: true,
      count: formattedApplications.length,
      applications: formattedApplications
    })

  } catch (error: any) {
    console.error('Error fetching assessor applications:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch applications',
        details: error.message
      },
      { status: 500 }
    )
  }
}
