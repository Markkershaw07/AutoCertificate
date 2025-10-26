/**
 * Test fetching data for a specific member
 */

const fs = require('fs')
const path = require('path')

// Manual .env.local parser
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  const envContent = fs.readFileSync(envPath, 'utf8')
  const lines = envContent.split('\n')

  lines.forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      process.env[key] = value
    }
  })
}

loadEnv()

const SHEEPCRM_API_KEY = process.env.SHEEPCRM_API_KEY
const SHEEPCRM_BASE_URL = process.env.SHEEPCRM_BASE_URL || 'https://api.sheepcrm.com'

const BUSY_BEES_URI = '/faib/organisation/673c41aca73165edfaec162d/'

async function testMemberData() {
  console.log('🧪 Testing Busy Bees Organisation Data')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`URI: ${BUSY_BEES_URI}`)
  console.log('')

  try {
    // Test 1: Get display name
    console.log('1️⃣  Testing display name...')
    const displayUrl = `${SHEEPCRM_BASE_URL}/api/v1/faib/organisation/673c41aca73165edfaec162d/display`
    console.log(`URL: ${displayUrl}`)

    const displayResponse = await fetch(displayUrl, {
      headers: { 'Authorization': `Bearer ${SHEEPCRM_API_KEY}` }
    })

    console.log(`Status: ${displayResponse.status}`)

    if (displayResponse.ok) {
      const displayData = await displayResponse.json()
      console.log('✅ Display name:', displayData.display_value || displayData)
    } else {
      const errorText = await displayResponse.text()
      console.log('❌ Error:', errorText)
    }

    console.log('')

    // Test 2: Get communications
    console.log('2️⃣  Testing communications/address...')
    const commsUrl = `${SHEEPCRM_BASE_URL}/api/v1${BUSY_BEES_URI}communications/detail`
    console.log(`URL: ${commsUrl}`)

    const commsResponse = await fetch(commsUrl, {
      headers: { 'Authorization': `Bearer ${SHEEPCRM_API_KEY}` }
    })

    console.log(`Status: ${commsResponse.status}`)

    if (commsResponse.ok) {
      const commsData = await commsResponse.json()
      console.log('✅ Communications data:', JSON.stringify(commsData, null, 2))
    } else {
      const errorText = await commsResponse.text()
      console.log('❌ Error:', errorText)
    }

    console.log('')

    // Test 3: Get memberships
    console.log('3️⃣  Testing memberships...')
    const membershipUrl = `${SHEEPCRM_BASE_URL}/api/v1${BUSY_BEES_URI}membership/all`
    console.log(`URL: ${membershipUrl}`)

    const membershipResponse = await fetch(membershipUrl, {
      headers: { 'Authorization': `Bearer ${SHEEPCRM_API_KEY}` }
    })

    console.log(`Status: ${membershipResponse.status}`)

    if (membershipResponse.ok) {
      const membershipData = await membershipResponse.json()
      console.log('✅ Memberships:', JSON.stringify(membershipData, null, 2))
    } else {
      const errorText = await membershipResponse.text()
      console.log('❌ Error:', errorText)
    }

  } catch (error) {
    console.error('❌ Fatal error:', error)
  }
}

testMemberData()
