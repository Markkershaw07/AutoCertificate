import { NextRequest, NextResponse } from 'next/server'
import {
  generateCertificateFromSheepUri,
  getRequestBaseUrl
} from '@/lib/sheepcrm-certificate'

export const runtime = 'nodejs'

/**
 * Manual sync endpoint for testing
 * Allows manual triggering of certificate generation from a SheepCRM member URI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { person_uri } = body

    if (!person_uri) {
      return NextResponse.json(
        { error: 'person_uri is required' },
        { status: 400 }
      )
    }

    console.log('Manual sync requested for URI:', person_uri)
    const baseUrl = await getRequestBaseUrl()
    const { certificateData, generated } = await generateCertificateFromSheepUri(person_uri, baseUrl)

    console.log('Certificate generated successfully:', {
      path: generated.path,
      company_name: certificateData.company_name
    })

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Certificate generated successfully',
      data: {
        company_name: certificateData.company_name,
        licence_number: certificateData.licence_number,
        storage_path: generated.path,
        signed_url: generated.signedUrl,
        admin_contact: certificateData.admin_contact
      }
    })

  } catch (error: any) {
    console.error('Manual sync error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Sync failed',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
