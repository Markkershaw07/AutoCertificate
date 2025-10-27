import {
  SheepCRMConfig,
  SheepCRMUri,
  ContactDisplayResponse,
  CommunicationsDetailResponse,
  PersonMembershipAllResponse,
  MembershipRecord,
  CertificateData,
  SheepCRMErrorResponse
} from '@/types/sheepcrm'

export class SheepCRMClient {
  private config: SheepCRMConfig

  constructor(config: SheepCRMConfig) {
    this.config = config
  }

  /**
   * Make authenticated request to SheepCRM API
   */
  private async request<T>(endpoint: string, options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: any
  }): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`

    const response = await fetch(url, {
      method: options?.method || 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: options?.body ? JSON.stringify(options.body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`SheepCRM API Error (${response.status}): ${errorData.error || response.statusText}`)
    }

    return response.json()
  }

  /**
   * Extract bucket, resource_type, and uid from a URI
   * URI format: /bucket/resource_type/uid/
   */
  private parseUri(uri: SheepCRMUri): { bucket: string; resourceType: string; uid: string } {
    const parts = uri.split('/').filter(p => p.length > 0)
    if (parts.length < 3) {
      throw new Error(`Invalid SheepCRM URI format: ${uri}`)
    }
    return {
      bucket: parts[0],
      resourceType: parts[1],
      uid: parts[2]
    }
  }

  /**
   * Get contact display name
   */
  async getContactName(personUri: SheepCRMUri): Promise<string> {
    const { bucket, resourceType, uid } = this.parseUri(personUri)
    const endpoint = `/api/v1/${bucket}/${resourceType}/${uid}/display`
    const response = await this.request<ContactDisplayResponse>(endpoint)
    return response.display_value
  }

  /**
   * Get full contact/organisation record
   */
  async getFullRecord(personUri: SheepCRMUri): Promise<any> {
    const endpoint = `/api/v1${personUri}`
    return this.request<any>(endpoint)
  }

  /**
   * Get contact address as formatted string
   * Works for both person and organisation records
   */
  async getContactAddress(personUri: SheepCRMUri): Promise<string> {
    const fullRecord = await this.getFullRecord(personUri)

    // Address can be in different places depending on resource type
    let addressParts: string[] = []

    if (fullRecord.data?.address_lines && Array.isArray(fullRecord.data.address_lines)) {
      // Organisation format
      addressParts = [...fullRecord.data.address_lines]

      if (fullRecord.data.locality) {
        addressParts.push(fullRecord.data.locality)
      }
      if (fullRecord.data.region) {
        addressParts.push(fullRecord.data.region)
      }
      if (fullRecord.data.postal_code) {
        addressParts.push(fullRecord.data.postal_code)
      }
      if (fullRecord.data.country) {
        addressParts.push(fullRecord.data.country)
      }
    } else if (fullRecord.data?.address && Array.isArray(fullRecord.data.address)) {
      // Alternative person format
      addressParts = fullRecord.data.address
    }

    if (addressParts.length === 0) {
      throw new Error('No address found for contact')
    }

    // Join address parts with commas
    return addressParts.filter(p => p).join(', ')
  }

  /**
   * Get all memberships for a person
   */
  async getPersonMemberships(personUri: SheepCRMUri): Promise<PersonMembershipAllResponse> {
    const endpoint = `/api/v1${personUri}membership/all`
    return this.request<PersonMembershipAllResponse>(endpoint)
  }

  /**
   * Get active membership for certificate generation
   * Filters ONLY for "First Aid Training Provider" membership type
   * Accepts both "active" and "future" status memberships
   */
  async getActiveMembership(personUri: SheepCRMUri): Promise<MembershipRecord> {
    const response = await this.getPersonMemberships(personUri)

    if (response.count === 0) {
      throw new Error('No memberships found for contact')
    }

    // Find "First Aid Training Provider" membership (active or future)
    const trainingProviderMembership = response.memberships.find(m => {
      const isTrainingProvider = m.display_value &&
        m.display_value.includes('First Aid Training Provider')
      const isValidStatus = m.membership_record_status === 'active' ||
                           m.membership_record_status === 'Active' ||
                           m.membership_record_status === 'future'

      return isTrainingProvider && isValidStatus
    })

    if (!trainingProviderMembership) {
      throw new Error('No "First Aid Training Provider" membership found for contact. Only Training Providers are eligible for certificates.')
    }

    return trainingProviderMembership
  }

  /**
   * Format membership dates from SheepCRM
   * Dates come as ISO strings like "2026-09-01T00:00:00"
   * Return just the date part in YYYY-MM-DD format
   */
  formatMembershipDates(startDate: string, endDate: string): { start: string; end: string } {
    return {
      start: startDate.split('T')[0],
      end: endDate.split('T')[0]
    }
  }

  /**
   * Get certificate data from a member URI
   * This is the primary method - webhooks provide member URIs
   */
  async getCertificateDataFromMember(memberUri: SheepCRMUri): Promise<CertificateData> {
    try {
      // Fetch the member record
      const memberRecord = await this.getFullRecord(memberUri)

      // Validate it's a "First Aid Training Provider" membership
      const isTrainingProvider = memberRecord.data?.membership_type?.display_value &&
        memberRecord.data.membership_type.display_value.includes('First Aid Training Provider')

      if (!isTrainingProvider) {
        throw new Error('Only "First Aid Training Provider" memberships are eligible for certificates.')
      }

      // Get the person/organisation URI from the member record
      const contactUri = memberRecord.data.member.ref

      // Fetch contact details
      const [companyName, companyAddress] = await Promise.all([
        this.getContactName(contactUri),
        this.getContactAddress(contactUri)
      ])

      // Format membership dates (use actual dates from SheepCRM)
      const dates = this.formatMembershipDates(
        memberRecord.data.start_date,
        memberRecord.data.end_date
      )

      return {
        company_name: companyName,
        company_address: companyAddress,
        licence_number: memberRecord.data.membership_number,
        membership_start_date: dates.start,
        membership_end_date: dates.end
      }
    } catch (error: any) {
      console.error('Error fetching certificate data from SheepCRM:', error)
      throw new Error(`Failed to fetch certificate data: ${error.message}`)
    }
  }

  /**
   * Get all certificate data for a person/organisation (legacy method for testing)
   * For production use getCertificateDataFromMember instead
   */
  async getCertificateData(personUri: SheepCRMUri): Promise<CertificateData> {
    try {
      // Fetch all required data in parallel for efficiency
      const [companyName, companyAddress, membership] = await Promise.all([
        this.getContactName(personUri),
        this.getContactAddress(personUri),
        this.getActiveMembership(personUri)
      ])

      // Format membership dates (use actual dates from SheepCRM)
      const dates = this.formatMembershipDates(
        membership.start_date,
        membership.end_date
      )

      return {
        company_name: companyName,
        company_address: companyAddress,
        licence_number: membership.membership_number,
        membership_start_date: dates.start,
        membership_end_date: dates.end
      }
    } catch (error: any) {
      console.error('Error fetching certificate data from SheepCRM:', error)
      throw new Error(`Failed to fetch certificate data: ${error.message}`)
    }
  }

  /**
   * Get form response data
   * Used for fetching renewal form submissions
   */
  async getFormResponse(formResponseUri: SheepCRMUri): Promise<any> {
    try {
      const endpoint = `/api/v1${formResponseUri}`
      return await this.request<any>(endpoint)
    } catch (error: any) {
      console.error('Error fetching form response from SheepCRM:', error)
      throw new Error(`Failed to fetch form response: ${error.message}`)
    }
  }

  /**
   * Create a journal note on a contact's profile
   * @param contactUri - The URI of the contact (organisation or person)
   * @param subject - Subject/title of the journal entry
   * @param note - The note content (supports markdown)
   * @returns The created journal entry
   */
  async createJournalNote(
    contactUri: SheepCRMUri,
    subject: string,
    note: string
  ): Promise<any> {
    try {
      const { bucket } = this.parseUri(contactUri)
      const endpoint = `/api/v1/${bucket}/journal/`

      const payload = {
        entity: contactUri,
        title: subject,
        body: note,
        entry_type: 'note'
      }

      return await this.request<any>(endpoint, {
        method: 'POST',
        body: payload
      })
    } catch (error: any) {
      console.error('Error creating journal note in SheepCRM:', error)
      throw new Error(`Failed to create journal note: ${error.message}`)
    }
  }
}

/**
 * Create SheepCRM client instance from environment variables
 */
export function createSheepCRMClient(): SheepCRMClient {
  const apiKey = process.env.SHEEPCRM_API_KEY
  const bucket = process.env.SHEEPCRM_BUCKET
  const baseUrl = process.env.SHEEPCRM_BASE_URL || 'https://sls-api.sheepcrm.com'

  if (!apiKey) {
    throw new Error('SHEEPCRM_API_KEY environment variable is not set')
  }

  if (!bucket) {
    throw new Error('SHEEPCRM_BUCKET environment variable is not set')
  }

  return new SheepCRMClient({ apiKey, bucket, baseUrl })
}
