// SheepCRM API Type Definitions

export interface SheepCRMConfig {
  apiKey: string
  bucket: string
  baseUrl: string
}

// URI format: /bucket/resource_type/uid/
export type SheepCRMUri = string

// Address is returned as an array of strings
export type SheepCRMAddress = string[]

// Contact Display Response
export interface ContactDisplayResponse {
  display_value: string
}

// Communications Detail Response
export interface CommunicationsDetailResponse {
  address?: SheepCRMAddress
  email?: string
  phone?: string
  [key: string]: any
}

// Membership Record
export interface MembershipRecord {
  uid: string
  uri: SheepCRMUri
  membership_number: string
  membership_type: SheepCRMUri
  membership_plan_type?: string
  membership_record_status: string
  display_value: string
  start_date: string
  end_date: string
  created: string
  last_updated: string
  amount?: number
  currency?: string
  auto_renew?: boolean
  member: SheepCRMUri
  admin_contact?: SheepCRMUri
  billing_contact?: SheepCRMUri
  has_renewed?: boolean
  cancellation_date?: string | null
  [key: string]: any
}

// Person Membership All Response
export interface PersonMembershipAllResponse {
  contact_uri: SheepCRMUri
  count: number
  memberships: MembershipRecord[]
}

// Webhook Payload (structure may vary - update based on actual SheepCRM webhooks)
export interface SheepCRMWebhookPayload {
  event: string
  timestamp: string
  data: {
    member_uri?: SheepCRMUri
    person_uri?: SheepCRMUri
    contact_uri?: SheepCRMUri
    payment_id?: string
    amount?: number
    currency?: string
    [key: string]: any
  }
  signature?: string
}

// Certificate Data (mapped from SheepCRM)
export interface CertificateData {
  company_name: string
  company_address: string
  licence_number: string
  membership_start_date: string
  membership_end_date: string
}

// API Error Response
export interface SheepCRMErrorResponse {
  error: string
  message?: string
  details?: any
}

// Form Response Reference
export interface FormResponseReference {
  display_value: string
  ref: SheepCRMUri
}

// Form Response Data Structure
export interface FormResponseData {
  contact_ref: FormResponseReference
  context_ref?: FormResponseReference[]
  form_ref: FormResponseReference
  status: 'started' | 'submitted' | 'withdrawn' | 'accepted' | 'rejected'
  response: Record<string, any> // Form answers - dynamic structure based on form
  expiry_date?: string | null
  submission_date?: string | null
  review_by_date?: string | null
  score?: number | null
  overall_feedback?: string | null
  overall_internal_comments?: string | null
  tags?: string[]
  users?: any[]
  [key: string]: any
}

// Full Form Response
export interface FormResponse {
  bucket: string
  resource: 'form_response'
  uri: SheepCRMUri
  display_value: string
  data: FormResponseData
  meta: {
    created: string
    last_updated: string
    state: string
  }
  links: any[]
}

// Renewal Form Specific Data (extracted from form response)
export interface RenewalFormSubmission {
  formResponseUri: SheepCRMUri
  organizationUri: SheepCRMUri
  organizationName: string
  contactUri: SheepCRMUri
  contactName: string

  // Certificate counts by type
  certificateCounts: {
    efaw?: number
    faw?: number
    fawr?: number
    pfa?: number
    emergencyPfa?: number
    outdoorFirstAid?: number
    emergencyOutdoorFirstAid?: number
    total: number
  }

  // Trainer information
  numberOfTrainers: number
  trainerNames: string[]

  // Compliance checkboxes
  hasBlendedCourses: boolean
  adminSystemRecords: string[]
  certificateContains: string[]
  trainerPortfolioItems: string[]
  qualityAssuranceCovers: string[]
  teachingMaterialsUsed: string[]

  // Raw form response for AI analysis
  rawResponse: Record<string, any>
}

// Webhook Payload for Form Submissions
export interface FormSubmissionWebhookPayload {
  event: string
  timestamp: string
  data: {
    form_response_uri?: SheepCRMUri
    uri?: SheepCRMUri
    status?: string
    form_ref?: SheepCRMUri
    contact_ref?: SheepCRMUri
    [key: string]: any
  }
  signature?: string
}
