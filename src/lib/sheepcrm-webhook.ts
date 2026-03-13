import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { SheepCRMUri, SheepCRMWebhookPayload } from '@/types/sheepcrm'

const DEFAULT_PAYMENT_EVENT_NAMES = [
  'payment.paid',
  'payment_paid',
  'payment.succeeded',
  'payment_succeeded',
  'payment.received',
  'payment_received',
  'invoice.paid',
  'invoice_paid'
]

const PAID_STATUS_VALUES = [
  'paid',
  'success',
  'successful',
  'succeeded',
  'complete',
  'completed',
  'captured',
  'settled'
]

const NON_PAID_STATUS_VALUES = [
  'pending',
  'failed',
  'failure',
  'refunded',
  'void',
  'voided',
  'cancelled',
  'canceled'
]

export interface WebhookClassification {
  eventName: string
  shouldProcess: boolean
  reason: string
  paymentId: string | null
  memberUri: SheepCRMUri | null
  fallbackUri: SheepCRMUri | null
  dedupeKey: string | null
  statusValues: string[]
}

function normalizeValue(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase()
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function getNestedString(record: Record<string, unknown> | null, path: string[]): string | null {
  let current: unknown = record

  for (const segment of path) {
    const currentRecord = asRecord(current)
    if (!currentRecord || !(segment in currentRecord)) {
      return null
    }
    current = currentRecord[segment]
  }

  return typeof current === 'string' && current.trim() ? current.trim() : null
}

function extractIdentifier(data: Record<string, unknown> | null, candidates: string[][]): string | null {
  for (const candidate of candidates) {
    const value = getNestedString(data, candidate)
    if (value) {
      return value
    }
  }

  return null
}

function extractUris(data: Record<string, unknown> | null): { memberUri: SheepCRMUri | null; fallbackUri: SheepCRMUri | null } {
  const memberUri = extractIdentifier(data, [
    ['member_uri'],
    ['member', 'ref'],
    ['member', 'uri'],
    ['membership_uri'],
    ['membership', 'ref'],
    ['membership', 'uri']
  ])

  const fallbackUri = extractIdentifier(data, [
    ['person_uri'],
    ['contact_uri'],
    ['contact', 'ref'],
    ['contact', 'uri'],
    ['member', 'member', 'ref'],
    ['member', 'member', 'uri'],
    ['person', 'ref'],
    ['person', 'uri'],
    ['organisation', 'ref'],
    ['organisation', 'uri'],
    ['organization', 'ref'],
    ['organization', 'uri'],
    ['uri'],
    ['ref']
  ])

  return {
    memberUri: memberUri && memberUri.includes('/member/') ? memberUri : null,
    fallbackUri
  }
}

function extractStatusValues(data: Record<string, unknown> | null): string[] {
  const candidates = [
    ['status'],
    ['payment_status'],
    ['payment', 'status'],
    ['payment', 'state'],
    ['state'],
    ['invoice_status'],
    ['invoice', 'status'],
    ['transaction_status']
  ]

  return candidates
    .map((candidate) => extractIdentifier(data, [candidate]))
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeValue(value))
}

function getConfiguredPaymentEventNames(): string[] {
  const configured = process.env.SHEEPCRM_PAYMENT_EVENT_NAMES

  if (!configured) {
    return DEFAULT_PAYMENT_EVENT_NAMES
  }

  return configured
    .split(',')
    .map((value) => normalizeValue(value))
    .filter(Boolean)
}

export function verifyWebhookSignature(payload: string, signature: string | null): boolean {
  if (process.env.SHEEPCRM_ALLOW_UNSIGNED_WEBHOOKS === 'true' && !signature) {
    console.warn('Accepting unsigned SheepCRM webhook because SHEEPCRM_ALLOW_UNSIGNED_WEBHOOKS=true')
    return true
  }

  if (!process.env.SHEEPCRM_WEBHOOK_SECRET) {
    console.warn('SHEEPCRM_WEBHOOK_SECRET not set - skipping signature verification')
    return true
  }

  if (!signature) {
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.SHEEPCRM_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  const normalizedSignature = signature.replace(/^sha256=/i, '').trim()

  if (normalizedSignature.length !== expectedSignature.length) {
    return false
  }

  return crypto.timingSafeEqual(
    Buffer.from(normalizedSignature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  )
}

export function classifyWebhookPayload(payload: SheepCRMWebhookPayload): WebhookClassification {
  const eventName = normalizeValue(payload.event)
  const configuredEventNames = getConfiguredPaymentEventNames()
  const data = asRecord(payload.data)
  const statusValues = extractStatusValues(data)
  const { memberUri, fallbackUri } = extractUris(data)
  const paymentId = extractIdentifier(data, [
    ['payment_id'],
    ['payment', 'id'],
    ['payment', 'ref'],
    ['invoice_id'],
    ['invoice', 'id'],
    ['transaction_id'],
    ['id']
  ])

  const matchesConfiguredEvent = configuredEventNames.includes(eventName)
  const hasPaymentKeyword = eventName.includes('payment') || eventName.includes('invoice')
  const isPaidStatus = statusValues.some((value) => PAID_STATUS_VALUES.includes(value))
  const isExplicitlyNotPaid = statusValues.some((value) => NON_PAID_STATUS_VALUES.includes(value))

  if (!eventName) {
    return {
      eventName,
      shouldProcess: false,
      reason: 'Missing event name',
      paymentId,
      memberUri,
      fallbackUri,
      dedupeKey: null,
      statusValues
    }
  }

  if (isExplicitlyNotPaid) {
    return {
      eventName,
      shouldProcess: false,
      reason: `Ignoring unpaid status: ${statusValues.join(', ')}`,
      paymentId,
      memberUri,
      fallbackUri,
      dedupeKey: null,
      statusValues
    }
  }

  const shouldProcess = matchesConfiguredEvent || (hasPaymentKeyword && isPaidStatus)

  if (!shouldProcess) {
    return {
      eventName,
      shouldProcess: false,
      reason: 'Ignoring event because it is not a confirmed paid payment event',
      paymentId,
      memberUri,
      fallbackUri,
      dedupeKey: null,
      statusValues
    }
  }

  const dedupeSource = paymentId || memberUri || fallbackUri
  const dedupeKey = dedupeSource
    ? crypto.createHash('sha256').update(`${eventName}:${dedupeSource}`).digest('hex')
    : null

  return {
    eventName,
    shouldProcess: true,
    reason: matchesConfiguredEvent
      ? 'Processing configured paid event'
      : 'Processing payment-like event with a paid status',
    paymentId,
    memberUri,
    fallbackUri,
    dedupeKey,
    statusValues
  }
}

function getMarkerPath(dedupeKey: string): string {
  return `webhook-processing/sheepcrm/${dedupeKey}.json`
}

export async function claimWebhookProcessing(dedupeKey: string, metadata: Record<string, unknown>) {
  const bucket = process.env.SUPABASE_BUCKET

  if (!bucket) {
    throw new Error('SUPABASE_BUCKET environment variable not configured')
  }

  const payload = JSON.stringify({
    status: 'processing',
    started_at: new Date().toISOString(),
    ...metadata
  })

  const { error } = await supabaseAdmin
    .storage
    .from(bucket)
    .upload(getMarkerPath(dedupeKey), payload, {
      contentType: 'application/json',
      upsert: false
    })

  if (!error) {
    return { claimed: true as const }
  }

  if (error.message?.toLowerCase().includes('exists') || `${error}`.toLowerCase().includes('duplicate')) {
    return { claimed: false as const }
  }

  throw new Error(`Failed to claim webhook processing marker: ${error.message}`)
}

export async function completeWebhookProcessing(dedupeKey: string, metadata: Record<string, unknown>) {
  const bucket = process.env.SUPABASE_BUCKET

  if (!bucket) {
    throw new Error('SUPABASE_BUCKET environment variable not configured')
  }

  const payload = JSON.stringify({
    status: 'completed',
    completed_at: new Date().toISOString(),
    ...metadata
  })

  const { error } = await supabaseAdmin
    .storage
    .from(bucket)
    .update(getMarkerPath(dedupeKey), payload, {
      contentType: 'application/json',
      upsert: true
    })

  if (error) {
    throw new Error(`Failed to update webhook processing marker: ${error.message}`)
  }
}

export async function releaseWebhookProcessing(dedupeKey: string) {
  const bucket = process.env.SUPABASE_BUCKET

  if (!bucket) {
    return
  }

  const { error } = await supabaseAdmin
    .storage
    .from(bucket)
    .remove([getMarkerPath(dedupeKey)])

  if (error) {
    console.warn('Failed to remove webhook processing marker after error:', error.message)
  }
}
