/**
 * Test script to verify the Trainer/Assessor application system
 * Tests fetching and analyzing an application form
 */

require('dotenv').config({ path: '.env.local' })

const FORM_RESPONSE_URI = '/faib/form_response/68ff8f0f5f0364f42f8f5359/'
const API_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000'

async function testAssessorApplication() {
  try {
    console.log('=== Testing Trainer/Assessor Application System ===\n')

    // Extract ID from URI
    const formId = FORM_RESPONSE_URI.split('/').filter(p => p.length > 0).pop()
    console.log(`Form ID: ${formId}\n`)

    // Test 1: Fetch the application
    console.log('1. Fetching application...')
    const fetchResponse = await fetch(`${API_BASE_URL}/api/assessor-applications/${formId}`)
    const fetchData = await fetchResponse.json()

    if (!fetchResponse.ok) {
      throw new Error(`Failed to fetch: ${fetchData.error || fetchData.details}`)
    }

    console.log('✓ Application fetched successfully')
    console.log(`  - Applicant: ${fetchData.application.applicantName}`)
    console.log(`  - Status: ${fetchData.application.status}`)
    console.log(`  - Submission Date: ${fetchData.application.submissionDate || 'N/A'}`)
    console.log(`  - Required Documents: ${fetchData.application.attachments.required.length}`)
    console.log(`  - Additional Documents: ${fetchData.application.attachments.additional.length}\n`)

    // Test 2: Analyze the application with AI
    console.log('2. Analyzing application with AI...')
    const analyzeResponse = await fetch(`${API_BASE_URL}/api/assessor-applications/${formId}/analyze`, {
      method: 'POST'
    })
    const analyzeData = await analyzeResponse.json()

    if (!analyzeResponse.ok) {
      throw new Error(`Failed to analyze: ${analyzeData.error || analyzeData.details}`)
    }

    console.log('✓ AI Analysis completed successfully')
    console.log(`  - Summary: ${analyzeData.data.analysis.summary}`)
    console.log(`  - Recommendation: ${analyzeData.data.analysis.recommendation.toUpperCase()}`)
    console.log(`  - Required Documents Checked: ${analyzeData.data.analysis.requiredDocuments.length}`)
    console.log(`  - Compliance Issues: ${analyzeData.data.analysis.complianceIssues.length}`)
    console.log(`  - Strengths: ${analyzeData.data.analysis.strengths.length}\n`)

    console.log('3. Review Note Preview:')
    console.log('─────────────────────────────')
    console.log(analyzeData.data.reviewNote.content)
    console.log('─────────────────────────────\n')

    console.log('=== All Tests Passed! ===\n')
    console.log('The Trainer/Assessor application system is working correctly.')
    console.log('You can now:')
    console.log(`  - View the application at: ${API_BASE_URL}/assessor-applications/${formId}`)
    console.log('  - Generate AI reviews')
    console.log('  - Post reviews to SheepCRM internal comments\n')

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message)
    console.error('\nError details:', error)
    process.exit(1)
  }
}

// Run the test
testAssessorApplication()
