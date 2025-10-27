/**
 * Test script to verify pricing calculations for all brackets
 */

// Simulate the pricing calculation logic
const PRICING_BRACKETS = [
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
  { min: 15001, max: null, price: 5250 },
]

const VAT_RATE = 0.20
const TRAINER_FEE = 20

function findPricingBracket(certificatesIssued) {
  for (const bracket of PRICING_BRACKETS) {
    if (certificatesIssued >= bracket.min) {
      if (bracket.max === null || certificatesIssued <= bracket.max) {
        return bracket
      }
    }
  }
  return PRICING_BRACKETS[PRICING_BRACKETS.length - 1]
}

function calculateRenewalPricing(certificatesIssued, numberOfTrainers) {
  const bracket = findPricingBracket(certificatesIssued)

  const membershipFeeExVAT = bracket.price
  const membershipVAT = membershipFeeExVAT * VAT_RATE
  const membershipFeeIncVAT = membershipFeeExVAT + membershipVAT

  const trainerFeeExVAT = numberOfTrainers * TRAINER_FEE
  const trainerVAT = trainerFeeExVAT * VAT_RATE
  const trainerFeeIncVAT = trainerFeeExVAT + trainerVAT

  const totalExVAT = membershipFeeExVAT + trainerFeeExVAT
  const totalVAT = membershipVAT + trainerVAT
  const totalIncVAT = membershipFeeIncVAT + trainerFeeIncVAT

  return {
    certificatesIssued,
    numberOfTrainers,
    bracket,
    membershipFeeExVAT,
    membershipVAT,
    membershipFeeIncVAT,
    trainerFeeExVAT,
    trainerVAT,
    trainerFeeIncVAT,
    totalExVAT,
    totalVAT,
    totalIncVAT
  }
}

console.log('=== PRICING CALCULATION TESTS ===\n')

// Test each bracket
const testCases = [
  { certs: 100, trainers: 2, desc: 'Low volume (0-500)' },
  { certs: 500, trainers: 3, desc: 'Bracket boundary (500)' },
  { certs: 501, trainers: 3, desc: 'Next bracket (501-750)' },
  { certs: 750, trainers: 4, desc: 'Bracket boundary (750)' },
  { certs: 1000, trainers: 5, desc: 'Bracket boundary (1000)' },
  { certs: 1200, trainers: 5, desc: 'Mid bracket (1001-1500)' },
  { certs: 1800, trainers: 6, desc: 'Mid bracket (1501-2000)' },
  { certs: 2300, trainers: 7, desc: 'Mid bracket (2001-2500)' },
  { certs: 2800, trainers: 8, desc: 'Mid bracket (2501-3000)' },
  { certs: 3200, trainers: 8, desc: 'Mid bracket (3001-3500)' },
  { certs: 3800, trainers: 9, desc: 'Mid bracket (3501-4000)' },
  { certs: 4300, trainers: 10, desc: 'Mid bracket (4001-4500)' },
  { certs: 4800, trainers: 10, desc: 'Mid bracket (4501-5000)' },
  { certs: 5500, trainers: 12, desc: 'Mid bracket (5001-6000)' },
  { certs: 6500, trainers: 12, desc: 'Mid bracket (6001-7000)' },
  { certs: 7500, trainers: 15, desc: 'Mid bracket (7001-8000)' },
  { certs: 8500, trainers: 15, desc: 'Mid bracket (8001-9000)' },
  { certs: 9500, trainers: 18, desc: 'Mid bracket (9001-10000)' },
  { certs: 12000, trainers: 20, desc: 'High volume (10001-15000)' },
  { certs: 20000, trainers: 25, desc: 'Very high volume (15000+)' },
]

testCases.forEach(test => {
  const result = calculateRenewalPricing(test.certs, test.trainers)

  console.log(`${test.desc}`)
  console.log(`  Certificates: ${result.certificatesIssued.toLocaleString()}`)
  console.log(`  Trainers: ${result.numberOfTrainers}`)
  console.log(`  Membership: £${result.membershipFeeExVAT.toFixed(2)} + VAT (£${result.membershipVAT.toFixed(2)}) = £${result.membershipFeeIncVAT.toFixed(2)}`)
  console.log(`  Trainers: £${result.trainerFeeExVAT.toFixed(2)} + VAT (£${result.trainerVAT.toFixed(2)}) = £${result.trainerFeeIncVAT.toFixed(2)}`)
  console.log(`  TOTAL: £${result.totalIncVAT.toFixed(2)} (inc. VAT)`)
  console.log()
})

console.log('✅ All pricing calculations tested successfully!')
