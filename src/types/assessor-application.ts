// Assessor/Trainer Application Type Definitions

import { SheepCRMUri } from './sheepcrm'

// Document/Attachment from form response
export interface AssessorApplicationAttachment {
  url: string
  filename: string
  fileSize?: number
  contentType?: string
  uploadedAt?: string
}

// Parsed assessor application data
export interface AssessorApplicationData {
  formResponseUri: SheepCRMUri
  formResponseId: string
  applicantUri: SheepCRMUri
  applicantName: string
  submissionDate: string | null
  status: 'started' | 'submitted' | 'withdrawn' | 'accepted' | 'rejected'

  // Personal Information
  personalInfo: {
    fullName?: string
    email?: string
    phone?: string
    address?: string
    dateOfBirth?: string
  }

  // Qualifications & Documentation
  qualifications: {
    firstAidCertificates?: string[]
    teachingQualifications?: string[]
    otherQualifications?: string[]
  }

  // Attachments
  attachments: {
    required: AssessorApplicationAttachment[]  // Required documents
    additional: AssessorApplicationAttachment[] // Extra uploaded files
  }

  // Comments/Feedback
  overallFeedback?: string | null
  internalComments?: string | null

  // Raw form data for AI analysis
  rawResponse: Record<string, any>
}

// AI Analysis Result
export interface AssessorAnalysisResult {
  summary: string
  applicantName: string
  submissionDate: string

  // Document checks
  requiredDocuments: {
    name: string
    present: boolean
    notes?: string
  }[]

  additionalDocuments: {
    filename: string
    notes?: string
  }[]

  // Compliance
  complianceIssues: string[]
  strengths: string[]

  // Recommendation
  recommendation: 'approve' | 'reject' | 'request_more_info'
  recommendationReason: string
}

// Review to post to SheepCRM
export interface AssessorReviewPost {
  formResponseUri: SheepCRMUri
  reviewContent: string
  updateStatus?: 'accepted' | 'rejected'
}
