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
