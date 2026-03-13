export interface CertificateTemplateConfig {
  key: string
  displayName: string
  templateFile: string
}

export const CERTIFICATE_TEMPLATES: CertificateTemplateConfig[] = [
  {
    key: 'first-aid-training-provider',
    displayName: 'First Aid Training Provider',
    templateFile: 'licence_template.pptx'
  },
  {
    key: 'mental-health-training-provider',
    displayName: 'Mental Health Training Provider',
    templateFile: 'mental_health_training_provider_template.pptx'
  },
  {
    key: 'in-safe-hands-award',
    displayName: 'In Safe Hands Award',
    templateFile: 'in_safe_hands_award_template.pptx'
  }
]

export function getSupportedMembershipTypes(): string[] {
  return CERTIFICATE_TEMPLATES.map((template) => template.displayName)
}

export function resolveCertificateTemplate(input?: {
  membershipTypeKey?: string | null
  membershipTypeDisplay?: string | null
}): CertificateTemplateConfig {
  const normalizedKey = (input?.membershipTypeKey || '').trim().toLowerCase()
  const normalizedDisplay = (input?.membershipTypeDisplay || '').trim().toLowerCase()

  const exactMatch = CERTIFICATE_TEMPLATES.find((template) =>
    template.key === normalizedKey || template.displayName.toLowerCase() === normalizedDisplay
  )

  if (exactMatch) {
    return exactMatch
  }

  const fuzzyMatch = CERTIFICATE_TEMPLATES.find((template) =>
    normalizedDisplay.includes(template.displayName.toLowerCase()) ||
    template.displayName.toLowerCase().includes(normalizedDisplay)
  )

  return fuzzyMatch || CERTIFICATE_TEMPLATES[0]
}

export function isSupportedMembershipType(displayValue?: string | null): boolean {
  if (!displayValue) {
    return false
  }

  return CERTIFICATE_TEMPLATES.some((template) =>
    displayValue.toLowerCase().includes(template.displayName.toLowerCase())
  )
}
