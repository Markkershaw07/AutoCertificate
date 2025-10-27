import { NextRequest, NextResponse } from 'next/server'
import { createSheepCRMClient } from '@/lib/sheepcrm'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

interface ReviewRequest {
  reviewContent: string
  updateStatus?: 'accepted' | 'rejected'
}

/**
 * Post review to SheepCRM form response internal comments
 * POST /api/assessor-applications/[id]/review
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const body: ReviewRequest = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      )
    }

    if (!body.reviewContent) {
      return NextResponse.json(
        { error: 'Review content is required' },
        { status: 400 }
      )
    }

    // Construct the form response URI
    const formResponseUri = `/faib/form_response/${id}/`

    console.log('Posting review to:', formResponseUri)

    const sheepCRM = createSheepCRMClient()

    // Update the form response with internal comments
    const endpoint = `/api/v1${formResponseUri}`
    const payload: any = {
      overall_internal_comments: body.reviewContent
    }

    // Optionally update status
    if (body.updateStatus) {
      payload.status = body.updateStatus
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

    const updatedFormResponse = await response.json()

    console.log('Review posted successfully to', formResponseUri)

    return NextResponse.json({
      success: true,
      data: {
        formResponseUri,
        reviewPosted: true,
        statusUpdated: body.updateStatus || null,
        updatedAt: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error('Error posting review:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to post review',
        details: error.message
      },
      { status: 500 }
    )
  }
}
