import { headers as nextHeaders } from 'next/headers'
import { createSheepCRMClient } from '@/lib/sheepcrm'
import { CertificateData, SheepCRMUri } from '@/types/sheepcrm'

export interface GenerateAndSaveResult {
  path: string
  signedUrl: string
  meta: {
    company_name: string
    licence_number: string
    membership_start_date: string
    membership_end_date: string
  }
}

export interface GeneratedCertificateResult {
  certificateData: CertificateData
  generated: GenerateAndSaveResult
}

function getBaseUrlFromHeaderValues(headerValues: Headers): string {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL
  }

  const protocol = headerValues.get('x-forwarded-proto') || 'http'
  const host = headerValues.get('host') || 'localhost:3000'
  return `${protocol}://${host}`
}

export async function getRequestBaseUrl(): Promise<string> {
  const headerValues = await nextHeaders()
  return getBaseUrlFromHeaderValues(headerValues)
}

export function isMemberUri(uri: SheepCRMUri): boolean {
  return uri.includes('/member/')
}

export async function fetchCertificateDataForUri(uri: SheepCRMUri): Promise<CertificateData> {
  const sheepCRM = createSheepCRMClient()
  return isMemberUri(uri)
    ? sheepCRM.getCertificateDataFromMember(uri)
    : sheepCRM.getCertificateData(uri)
}

export async function generateAndSaveCertificate(
  certificateData: CertificateData,
  baseUrl: string
): Promise<GenerateAndSaveResult> {
  const response = await fetch(`${baseUrl}/api/generate-licence-and-save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(certificateData)
  })

  const payload = await response.json()

  if (!response.ok) {
    throw new Error(`Certificate generation failed: ${payload.error || 'Unknown error'}`)
  }

  return payload
}

export async function generateCertificateFromSheepUri(
  uri: SheepCRMUri,
  baseUrl: string
): Promise<GeneratedCertificateResult> {
  const certificateData = await fetchCertificateDataForUri(uri)
  const generated = await generateAndSaveCertificate(certificateData, baseUrl)

  return {
    certificateData,
    generated
  }
}
