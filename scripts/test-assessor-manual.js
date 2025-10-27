/**
 * Test script for Manual Assessor Application Analyzer
 * Tests the new URI-based workflow (like Renewal Analyzer)
 */

require('dotenv').config({ path: '.env.local' })

const FORM_RESPONSE_URI = '/faib/form_response/68ff8f0f5f0364f42f8f5359/'
const API_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000'

async function testManualAssessorAnalyzer() {
  try {
    console.log('=== Testing Manual Assessor Application Analyzer ===\n')
    console.log(`Form Response URI: ${FORM_RESPONSE_URI}`)
    console.log(`API Base URL: ${API_BASE_URL}\n`)

    // Test: Analyze application (without posting)
    console.log('1. Analyzing application (without posting to SheepCRM)...')
    const analyzeResponse = await fetch(`${API_BASE_URL}/api/assessor-applications/analyze-manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        formResponseUri: FORM_RESPONSE_URI,
        postToSheepCRM: false
      })
    })

    const analyzeData = await analyzeResponse.json()

    if (!analyzeResponse.ok) {
      throw new Error(`Failed to analyze: ${analyzeData.error || analyzeData.details}`)
    }

    console.log('✓ Analysis completed successfully\n')

    // Display results
    console.log('=== ANALYSIS RESULTS ===\n')
    console.log(`Applicant: ${analyzeData.data.applicant.name}`)
    console.log(`Status: ${analyzeData.data.application.status}`)
    console.log(`Submission Date: ${analyzeData.data.application.submissionDate}`)
    console.log(`\nDocuments:`)
    console.log(`  - Required: ${analyzeData.data.application.attachments.required.length}`)
    console.log(`  - Additional: ${analyzeData.data.application.attachments.additional.length}`)
    console.log(`\nAI Analysis:`)
    console.log(`  - Summary: ${analyzeData.data.analysis.summary.substring(0, 100)}...`)
    console.log(`  - Required Documents Checked: ${analyzeData.data.analysis.requiredDocuments.length}`)
    console.log(`  - Compliance Issues: ${analyzeData.data.analysis.complianceIssues.length}`)
    console.log(`  - Strengths: ${analyzeData.data.analysis.strengths.length}`)
    console.log(`  - Recommendation: ${analyzeData.data.analysis.recommendation.toUpperCase()}`)
    console.log(`\nReview Note Generated: ${analyzeData.data.note.content.length} characters`)
    console.log(`Posted to SheepCRM: ${analyzeData.data.note.posted ? 'Yes' : 'No'}`)

    console.log('\n=== Test Passed! ===\n')
    console.log('The Manual Assessor Application Analyzer is working correctly.')
    console.log('You can now:')
    console.log(`  1. Visit: ${API_BASE_URL}/assessor-applications`)
    console.log(`  2. Paste the form URI: ${FORM_RESPONSE_URI}`)
    console.log('  3. Click "Analyze Application"')
    console.log('  4. Review the results')
    console.log('  5. Edit the review if needed')
    console.log('  6. Click "Post Review to SheepCRM" to save\n')

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message)
    console.error('\nError details:', error)
    process.exit(1)
  }
}

testManualAssessorAnalyzer()
