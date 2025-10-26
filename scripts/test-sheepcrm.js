/**
 * Test script to connect to SheepCRM and list members
 * Run with: node scripts/test-sheepcrm.js
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
const SHEEPCRM_BUCKET = process.env.SHEEPCRM_BUCKET
const SHEEPCRM_BASE_URL = process.env.SHEEPCRM_BASE_URL

if (!SHEEPCRM_API_KEY || !SHEEPCRM_BUCKET || !SHEEPCRM_BASE_URL) {
  console.error('❌ Missing SheepCRM environment variables')
  console.error('Make sure .env.local has:')
  console.error('  - SHEEPCRM_API_KEY')
  console.error('  - SHEEPCRM_BUCKET')
  console.error('  - SHEEPCRM_BASE_URL')
  process.exit(1)
}

async function testSheepCRMConnection() {
  console.log('🔍 Testing SheepCRM Connection...')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Base URL: ${SHEEPCRM_BASE_URL}`)
  console.log(`Bucket: ${SHEEPCRM_BUCKET}`)
  console.log(`API Key: ${SHEEPCRM_API_KEY.substring(0, 10)}...`)
  console.log('')

  try {
    // Test 1: Get resource types (list of available data types) - Try v1 first
    console.log('📋 Test 1: Fetching resource types (v1 API)...')
    const resourceTypesUrl = `${SHEEPCRM_BASE_URL}/api/v1/${SHEEPCRM_BUCKET}/`
    console.log(`URL: ${resourceTypesUrl}`)

    const resourceResponse = await fetch(resourceTypesUrl, {
      headers: {
        'Authorization': `Bearer ${SHEEPCRM_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!resourceResponse.ok) {
      const errorText = await resourceResponse.text()
      console.error(`❌ Resource types request failed (${resourceResponse.status}):`, errorText)
      return
    }

    const resourceData = await resourceResponse.json()
    console.log('✅ Successfully connected to SheepCRM!')
    console.log(`Found ${resourceData.resource_type?.length || 0} resource types`)
    console.log('')

    // Test 2: Search for members with "First Aid Training Provider" membership
    console.log('👥 Test 2: Searching for members...')

    // Try to get members directly using v1 API
    const membersUrl = `${SHEEPCRM_BASE_URL}/api/v1/${SHEEPCRM_BUCKET}/member/`
    console.log(`URL: ${membersUrl}`)

    const membersResponse = await fetch(membersUrl, {
      headers: {
        'Authorization': `Bearer ${SHEEPCRM_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!membersResponse.ok) {
      const errorText = await membersResponse.text()
      console.error(`❌ Members request failed (${membersResponse.status}):`, errorText)
      console.log('')
      console.log('💡 This might be because we need to use a different endpoint.')
      console.log('   Let me try searching for people instead...')
      console.log('')

      // Try search endpoint
      await searchForPeople()
      return
    }

    const membersData = await membersResponse.json()
    console.log('✅ Successfully fetched members!')
    console.log('')

    if (membersData.results && membersData.results.length > 0) {
      console.log('📝 Available Members for Testing:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // Filter for training providers (organisations or specific membership types)
      const trainingProviders = membersData.results.filter(m =>
        m.display_value && (
          m.display_value.includes('Training Provider') ||
          m.display_value.includes('First Aid') ||
          m.data?.membership_number
        )
      )

      const membersToShow = trainingProviders.length > 0 ? trainingProviders.slice(0, 5) : membersData.results.slice(0, 5)

      membersToShow.forEach((member, index) => {
        console.log(`\n${index + 1}. ${member.display_value}`)
        if (member.data?.membership_number) {
          console.log(`   Licence #: ${member.data.membership_number}`)
        }
        if (member.data?.membership_record_status) {
          console.log(`   Status: ${member.data.membership_record_status}`)
        }
        if (member.data?.member) {
          console.log(`   👉 Person URI: ${member.data.member}`)
        }
        if (member.data?.start_date && member.data?.end_date) {
          console.log(`   Period: ${member.data.start_date.split('T')[0]} to ${member.data.end_date.split('T')[0]}`)
        }
      })

      console.log('')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('✅ Testing complete!')
      console.log('')
      console.log('🎯 Next Steps:')
      console.log('1. Copy one of the "Person URI" values above')
      console.log('2. Go to http://localhost:3001/sheepcrm-sync')
      console.log('3. Paste the URI and test certificate generation')
    } else {
      console.log('⚠️  No members found or unexpected response format')
      console.log('Response:', JSON.stringify(membersData, null, 2))
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
  }
}

async function searchForPeople() {
  try {
    // Try search endpoint for people using v1 API
    const searchUrl = `${SHEEPCRM_BASE_URL}/api/v1/${SHEEPCRM_BUCKET}/person/`
    console.log(`🔍 Searching for people...`)
    console.log(`URL: ${searchUrl}`)

    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SHEEPCRM_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error(`❌ Search request failed (${searchResponse.status}):`, errorText)
      return
    }

    const searchData = await searchResponse.json()
    console.log('✅ Search successful!')
    console.log('')

    if (searchData.results && searchData.results.length > 0) {
      console.log('📝 Found People:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      searchData.results.slice(0, 5).forEach((person, index) => {
        console.log(`\n${index + 1}. Person:`)
        console.log(`   URI: ${person.uri}`)
        if (person.display) console.log(`   Name: ${person.display}`)
        if (person.email) console.log(`   Email: ${person.email}`)
      })

      console.log('')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('✅ Testing complete!')
      console.log('')
      console.log('🎯 Next Steps:')
      console.log('1. Copy one of the URI values above')
      console.log('2. Go to http://localhost:3001/sheepcrm-sync')
      console.log('3. Paste the URI and test certificate generation')
    } else {
      console.log('⚠️  No people found or unexpected response format')
      console.log('Response:', JSON.stringify(searchData, null, 2))
    }

  } catch (error) {
    console.error('❌ Search error:', error.message)
  }
}

// Run the test
testSheepCRMConnection()
