/**
 * Renewal Pricing Calculator
 * Calculates FAIB membership renewal fees based on certificates issued and trainer count
 */

export interface PricingBracket {
  min: number
  max: number | null // null for the highest bracket (no upper limit)
  price: number // Price in GBP (excluding VAT)
}

export interface PricingBreakdown {
  certificatesIssued: number
  numberOfTrainers: number

  // Base membership fee
  membershipFeeExVAT: number
  membershipVAT: number
  membershipFeeIncVAT: number

  // Trainer fees
  trainerFeeExVAT: number
  trainerVAT: number
  trainerFeeIncVAT: number

  // Totals
  totalExVAT: number
  totalVAT: number
  totalIncVAT: number

  // Metadata
  bracketDescription: string
}

/**
 * Pricing brackets from 01/01/2025
 * Based on number of certificates issued in the previous year
 */
const PRICING_BRACKETS: PricingBracket[] = [
  { min: 0, max: 500, price: 350 },
  { min: 501, max: 750, price: 475 },
  { min: 751, max: 1000, price: 575 },
  { min: 1001, max: 1500, price: 700 },
  { min: 1501, max: 2000, price: 1050 },
  { min: 2001, max: 2500, price: 1400 },
  { min: 2501, max: 3000, price: 1750 },
  { min: 3001, max: 3500, price: 2100 },
  { min: 3501, max: 4000, price: 2450 },
  { min: 4001, max: 4500, price: 2800 },
  { min: 4501, max: 5000, price: 3150 },
  { min: 5001, max: 6000, price: 3500 },
  { min: 6001, max: 7000, price: 3850 },
  { min: 7001, max: 8000, price: 4200 },
  { min: 8001, max: 9000, price: 4550 },
  { min: 9001, max: 10000, price: 4900 },
  { min: 10001, max: 15000, price: 5250 },
  { min: 15001, max: null, price: 5250 }, // 15,000+ uses the same price as 10,000-15,000
]

const VAT_RATE = 0.20 // 20%
const TRAINER_FEE = 20 // £20 per trainer (ex VAT)

/**
 * Find the appropriate pricing bracket for the given certificate count
 */
function findPricingBracket(certificatesIssued: number): PricingBracket {
  for (const bracket of PRICING_BRACKETS) {
    if (certificatesIssued >= bracket.min) {
      if (bracket.max === null || certificatesIssued <= bracket.max) {
        return bracket
      }
    }
  }

  // Fallback to the highest bracket (should never happen with proper data)
  return PRICING_BRACKETS[PRICING_BRACKETS.length - 1]
}

/**
 * Format bracket description for display
 */
function getBracketDescription(bracket: PricingBracket): string {
  if (bracket.max === null) {
    return `${bracket.min.toLocaleString()}+ certificates`
  }
  return `${bracket.min.toLocaleString()}-${bracket.max.toLocaleString()} certificates`
}

/**
 * Calculate renewal pricing with detailed breakdown
 */
export function calculateRenewalPricing(
  certificatesIssued: number,
  numberOfTrainers: number
): PricingBreakdown {
  // Find the appropriate pricing bracket
  const bracket = findPricingBracket(certificatesIssued)

  // Calculate membership fee
  const membershipFeeExVAT = bracket.price
  const membershipVAT = membershipFeeExVAT * VAT_RATE
  const membershipFeeIncVAT = membershipFeeExVAT + membershipVAT

  // Calculate trainer fees
  const trainerFeeExVAT = numberOfTrainers * TRAINER_FEE
  const trainerVAT = trainerFeeExVAT * VAT_RATE
  const trainerFeeIncVAT = trainerFeeExVAT + trainerVAT

  // Calculate totals
  const totalExVAT = membershipFeeExVAT + trainerFeeExVAT
  const totalVAT = membershipVAT + trainerVAT
  const totalIncVAT = membershipFeeIncVAT + trainerFeeIncVAT

  return {
    certificatesIssued,
    numberOfTrainers,

    membershipFeeExVAT,
    membershipVAT,
    membershipFeeIncVAT,

    trainerFeeExVAT,
    trainerVAT,
    trainerFeeIncVAT,

    totalExVAT,
    totalVAT,
    totalIncVAT,

    bracketDescription: getBracketDescription(bracket)
  }
}

/**
 * Format pricing breakdown as a readable string for SheepCRM notes
 */
export function formatPricingBreakdown(breakdown: PricingBreakdown): string {
  const lines: string[] = []

  lines.push('**RENEWAL PRICING BREAKDOWN**')
  lines.push('')

  // Membership fee
  lines.push(`Membership Fee (${breakdown.bracketDescription}):`)
  lines.push(`  £${breakdown.membershipFeeExVAT.toFixed(2)} + VAT (£${breakdown.membershipVAT.toFixed(2)}) = £${breakdown.membershipFeeIncVAT.toFixed(2)}`)
  lines.push('')

  // Trainer fees
  if (breakdown.numberOfTrainers > 0) {
    lines.push(`Trainer Fees (${breakdown.numberOfTrainers} trainer${breakdown.numberOfTrainers > 1 ? 's' : ''} × £${TRAINER_FEE}):`)
    lines.push(`  £${breakdown.trainerFeeExVAT.toFixed(2)} + VAT (£${breakdown.trainerVAT.toFixed(2)}) = £${breakdown.trainerFeeIncVAT.toFixed(2)}`)
    lines.push('')
  }

  // Total
  lines.push('─────────────────────────────')
  lines.push(`**TOTAL RENEWAL COST: £${breakdown.totalIncVAT.toFixed(2)} (inc. VAT)**`)
  lines.push(`(£${breakdown.totalExVAT.toFixed(2)} + £${breakdown.totalVAT.toFixed(2)} VAT)`)

  return lines.join('\n')
}
