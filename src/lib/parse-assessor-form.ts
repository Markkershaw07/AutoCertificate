/**
 * Utility to parse Trainer/Assessor application form responses from SheepCRM
 */

import { FormResponse } from '@/types/sheepcrm'
import { AssessorApplicationData, AssessorApplicationAttachment } from '@/types/assessor-application'

/**
 * Parse form response data into structured assessor application
 */
export function parseAssessorFormResponse(formResponse: FormResponse): AssessorApplicationData {
  const { data, uri } = formResponse
  const response = data.response

  // Extract form response ID from URI
  const formResponseId = uri.split('/').filter(p => p.length > 0).pop() || ''

  // Extract applicant information
  const applicantUri = data.contact_ref.ref
  const applicantName = data.contact_ref.display_value

  // Submission date
  const submissionDate = data.submission_date || null

  // Status
  const status = data.status || 'submitted'

  // Helper function to find field value by suffix
  const findFieldValue = (suffix: string): any => {
    const fieldKey = Object.keys(response).find(key => key.endsWith(suffix))
    return fieldKey ? response[fieldKey] : undefined
  }

  // Helper function to find field by partial key match
  const findFieldByPartial = (partial: string): any => {
    const fieldKey = Object.keys(response).find(key =>
      key.toLowerCase().includes(partial.toLowerCase())
    )
    return fieldKey ? response[fieldKey] : undefined
  }

  // Parse personal information
  const personalInfo = {
    fullName: findFieldByPartial('full-name') || findFieldByPartial('name') || applicantName,
    email: findFieldByPartial('email'),
    phone: findFieldByPartial('phone') || findFieldByPartial('telephone') || findFieldByPartial('mobile'),
    address: findFieldByPartial('address'),
    dateOfBirth: findFieldByPartial('date-of-birth') || findFieldByPartial('dob')
  }

  // Parse qualifications
  const qualifications = {
    firstAidCertificates: ensureArray(
      findFieldByPartial('first-aid-certificate') ||
      findFieldByPartial('first-aid-qualification')
    ),
    teachingQualifications: ensureArray(
      findFieldByPartial('teaching-qualification') ||
      findFieldByPartial('teaching-certificate') ||
      findFieldByPartial('assessor-qualification')
    ),
    otherQualifications: ensureArray(
      findFieldByPartial('other-qualification') ||
      findFieldByPartial('additional-qualification')
    )
  }

  // Parse attachments
  const attachments = parseAttachments(response)

  return {
    formResponseUri: uri,
    formResponseId,
    applicantUri,
    applicantName,
    submissionDate,
    status,
    personalInfo,
    qualifications,
    attachments,
    overallFeedback: data.overall_feedback,
    internalComments: data.overall_internal_comments,
    rawResponse: response
  }
}

/**
 * Parse attachments from form response
 * Separates required documents from additional uploads
 */
function parseAttachments(response: Record<string, any>): {
  required: AssessorApplicationAttachment[]
  additional: AssessorApplicationAttachment[]
} {
  const required: AssessorApplicationAttachment[] = []
  const additional: AssessorApplicationAttachment[] = []

  // Required document field patterns
  const requiredPatterns = [
    'first-aid-certificate',
    'teaching-qualification',
    'teaching-certificate',
    'assessor-qualification',
    'assessor-certificate',
    'dbs-check',
    'dbs-certificate',
    'id-document',
    'identification',
    'proof-of-identity',
    'insurance',
    'professional-indemnity'
  ]

  // Additional document patterns
  const additionalPatterns = [
    'additional-document',
    'other-document',
    'supporting-document',
    'extra-document'
  ]

  // Iterate through all form fields
  Object.keys(response).forEach(fieldKey => {
    const value = response[fieldKey]

    // Check if this field contains file uploads
    if (isFileField(value)) {
      const files = ensureArray(value)
      const isRequired = requiredPatterns.some(pattern =>
        fieldKey.toLowerCase().includes(pattern)
      )
      const isAdditional = additionalPatterns.some(pattern =>
        fieldKey.toLowerCase().includes(pattern)
      )

      // Convert to attachment objects
      const attachments = files.map(file => parseFileObject(file))

      if (isRequired) {
        required.push(...attachments)
      } else if (isAdditional || !isRequired) {
        // If not explicitly required, treat as additional
        additional.push(...attachments)
      }
    }
  })

  return { required, additional }
}

/**
 * Check if a value is a file field
 */
function isFileField(value: any): boolean {
  if (!value) return false

  // Check if it's an object with file properties
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return value.some(item => typeof item === 'object' && item !== null && (item.url || item.filename))
    }
    return value.url || value.filename
  }

  // Check if it's a URL string
  if (typeof value === 'string') {
    return value.startsWith('http') && (
      value.includes('/file/') ||
      value.includes('/upload/') ||
      value.includes('/attachment/')
    )
  }

  return false
}

/**
 * Parse a file object from form response
 */
function parseFileObject(file: any): AssessorApplicationAttachment {
  if (typeof file === 'string') {
    // Just a URL string
    return {
      url: file,
      filename: file.split('/').pop() || 'unknown',
    }
  }

  // Object with properties
  return {
    url: file.url || file.href || '',
    filename: file.filename || file.name || 'unknown',
    fileSize: file.size || file.fileSize,
    contentType: file.contentType || file.type || file.mimeType,
    uploadedAt: file.uploadedAt || file.created
  }
}

/**
 * Ensure value is an array
 */
function ensureArray(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.filter(v => v != null && v !== '').map(v => String(v))
  }
  if (typeof value === 'string' && value.length > 0) {
    return [value]
  }
  return []
}

/**
 * Get required document checklist for a specific form type
 * This should be customized based on your actual form structure
 */
export function getRequiredDocumentChecklist(): string[] {
  return [
    'First Aid Certificate',
    'Teaching/Assessor Qualification',
    'DBS Check',
    'Proof of Identity',
    'Professional Indemnity Insurance'
  ]
}
