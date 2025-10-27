/**
 * Test script to debug journal note creation
 */

require('dotenv').config({ path: '.env.local' })

const SHEEPCRM_API_KEY = process.env.SHEEPCRM_API_KEY
const SHEEPCRM_BASE_URL = process.env.SHEEPCRM_BASE_URL || 'https://api.sheepcrm.com'
const ORG_URI = '/faib/organisation/673c41daa73165edfaec1b52/' // AShawExperienceFirstAid

async function testJournalCreation() {
  try {
    console.log('Testing journal note creation...')
    console.log(`Organization URI: ${ORG_URI}`)

    const payload = {
      entity: ORG_URI,
      title: 'Test Note - Manual Creation',
      body: 'This is a test note to verify journal creation works.',
      entry_type: 'note'
    }

    console.log('\nPayload:', JSON.stringify(payload, null, 2))

    const response = await fetch(`${SHEEPCRM_BASE_URL}/api/v1/faib/journal/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SHEEPCRM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    console.log(`\nResponse Status: ${response.status} ${response.statusText}`)

    const data = await response.json()
    console.log('\nResponse Data:', JSON.stringify(data, null, 2))

    if (!response.ok) {
      console.error('\n❌ Failed to create journal note')
    } else {
      console.log('\n✅ Journal note created successfully!')
      console.log(`Journal URI: ${data.uri}`)
    }

  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

testJournalCreation()
