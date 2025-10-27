/**
 * Test script to fetch and examine form response structure
 */

require('dotenv').config({ path: '.env.local' })

const SHEEPCRM_API_KEY = process.env.SHEEPCRM_API_KEY
const SHEEPCRM_BASE_URL = process.env.SHEEPCRM_BASE_URL || 'https://sls-api.sheepcrm.com'
const FORM_RESPONSE_URI = '/faib/form_response/68f60dbd721825bf803241d2/'

async function fetchFormResponse() {
  try {
    console.log('Fetching form response...')
    console.log(`URL: ${SHEEPCRM_BASE_URL}/api/v1${FORM_RESPONSE_URI}`)

    const response = await fetch(`${SHEEPCRM_BASE_URL}/api/v1${FORM_RESPONSE_URI}`, {
      headers: {
        'Authorization': `Bearer ${SHEEPCRM_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(`API Error (${response.status}): ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    console.log('\n=== FORM RESPONSE DATA ===\n')
    console.log(JSON.stringify(data, null, 2))

  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

fetchFormResponse()
