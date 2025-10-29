import { NextRequest, NextResponse } from 'next/server'
import { createSheepCRMClient } from '@/lib/sheepcrm'

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

    // Create SheepCRM client and fetch certificate data
    const sheepCRM = createSheepCRMClient()

    // Detect if this is a member URI or person/organisation URI
    const isMemberUri = person_uri.includes('/member/')
    const certificateData = isMemberUri
      ? await sheepCRM.getCertificateDataFromMember(person_uri)
      : await sheepCRM.getCertificateData(person_uri)

    console.log('Fetched certificate data:', {
      company_name: certificateData.company_name,
      licence_number: certificateData.licence_number
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

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Certificate generated successfully',
      data: {
        company_name: certificateData.company_name,
        licence_number: certificateData.licence_number,
        storage_path: result.path,
        signed_url: result.signedUrl,
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
