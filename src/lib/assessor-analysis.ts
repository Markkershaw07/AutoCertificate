/**
 * AI Analysis Service for Trainer/Assessor Applications
 * Uses Claude AI to analyze applications and generate review summaries
 */

import Anthropic from '@anthropic-ai/sdk'
import { AssessorApplicationData, AssessorAnalysisResult } from '@/types/assessor-application'
import { getRequiredDocumentChecklist } from './parse-assessor-form'

/**
 * Create Anthropic client
 */
function createAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  }

  return new Anthropic({ apiKey })
}

/**
 * Extract JSON from Claude response, handling markdown code blocks
 */
function extractJSON(text: string): any {
  let jsonText = text.trim()

  // Check for ```json ... ``` or ``` ... ```
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  }

  return JSON.parse(jsonText)
}

/**
 * Analyze Trainer/Assessor application using Claude AI
 */
export async function analyzeAssessorApplication(
  applicationData: AssessorApplicationData
): Promise<AssessorAnalysisResult> {
  const client = createAnthropicClient()

  // Build required documents checklist
  const requiredDocsList = getRequiredDocumentChecklist()

  const prompt = `You are analyzing a Trainer/Assessor application for FAIB (First Aid Industry Body).

APPLICATION DATA:
Applicant: ${applicationData.applicantName}
Submission Date: ${applicationData.submissionDate || 'Not specified'}
Status: ${applicationData.status}

PERSONAL INFORMATION:
${JSON.stringify(applicationData.personalInfo, null, 2)}

QUALIFICATIONS:
${JSON.stringify(applicationData.qualifications, null, 2)}

REQUIRED DOCUMENTS CHECKLIST:
${requiredDocsList.map((doc, i) => `${i + 1}. ${doc}`).join('\n')}

UPLOADED DOCUMENTS (Required):
${applicationData.attachments.required.length > 0
    ? applicationData.attachments.required.map((att, i) => `${i + 1}. ${att.filename}`).join('\n')
    : '(None uploaded in required fields)'}

UPLOADED DOCUMENTS (Additional):
${applicationData.attachments.additional.length > 0
    ? applicationData.attachments.additional.map((att, i) => `${i + 1}. ${att.filename}`).join('\n')
    : '(No additional documents)'}

FORM ANSWERS:
${JSON.stringify(applicationData.rawResponse, null, 2)}

TASK:
Analyze this Trainer/Assessor application and provide a comprehensive review.

ANALYSIS REQUIREMENTS:
1. **Required Documents Check**: For each required document in the checklist above, determine if it's present based on uploaded filenames
2. **Additional Documents**: Note any extra documents uploaded (like Paediatric First Aid Certificate) and what they might be
3. **Compliance Issues**: Flag any problems:
   - Missing required documents (ONLY from the checklist above - do NOT mention documents not in the list)
   - Incomplete personal information
   - Expired certificates (if dates are visible in filenames or form data)
   - Missing course numbers (should have answered 3-year and 12-month course count questions)
4. **Strengths**: Highlight positive aspects of the application
5. **Recommendation**: Based on the analysis, recommend one of:
   - "approve" - Application is complete and meets requirements
   - "request_more_info" - Application needs clarification or missing documents
   - "reject" - Application has serious issues

CRITICAL RULES - READ CAREFULLY:
- ONLY check for the documents in the "REQUIRED DOCUMENTS CHECKLIST" above
- DO NOT mention DBS checks, identity verification, or any other documents not in the checklist
- DO NOT use your knowledge of what "should" be required - only check what IS required in THIS form
- Base your analysis ONLY on the actual form fields and uploaded documents
- If a document filename suggests it matches a requirement (e.g., "First_Aid_Certificate.pdf"), mark it as present
- Note additional/optional documents (like Paediatric First Aid) positively but don't mark them as "missing required"
- Be professional and constructive in your feedback

Provide your analysis in this exact JSON format:
{
  "summary": "2-3 sentence overview of the application quality",
  "requiredDocuments": [
    {
      "name": "Document Name",
      "present": true/false,
      "notes": "Optional notes about this document"
    }
  ],
  "additionalDocuments": [
    {
      "filename": "file.pdf",
      "notes": "What this document appears to be"
    }
  ],
  "complianceIssues": ["Issue 1", "Issue 2", ...],
  "strengths": ["Strength 1", "Strength 2", ...],
  "recommendation": "approve|request_more_info|reject",
  "recommendationReason": "Clear explanation of why this recommendation"
}`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    // Extract the text content from the response
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Parse the JSON response
    let analysis
    try {
      analysis = extractJSON(content.text)
    } catch (parseError: any) {
      console.error('JSON parsing error. Raw response:', content.text)
      throw new Error(`Failed to parse Claude response as JSON: ${parseError.message}`)
    }

    return {
      summary: analysis.summary || '',
      applicantName: applicationData.applicantName,
      submissionDate: applicationData.submissionDate || 'Not specified',
      requiredDocuments: analysis.requiredDocuments || [],
      additionalDocuments: analysis.additionalDocuments || [],
      complianceIssues: analysis.complianceIssues || [],
      strengths: analysis.strengths || [],
      recommendation: analysis.recommendation || 'request_more_info',
      recommendationReason: analysis.recommendationReason || ''
    }

  } catch (error: any) {
    console.error('AI analysis error:', error)

    // Fallback: provide basic analysis without AI
    return {
      summary: `Application received from ${applicationData.applicantName}. AI analysis failed - manual review required.`,
      applicantName: applicationData.applicantName,
      submissionDate: applicationData.submissionDate || 'Not specified',
      requiredDocuments: requiredDocsList.map(doc => ({
        name: doc,
        present: false,
        notes: 'Manual verification required'
      })),
      additionalDocuments: applicationData.attachments.additional.map(att => ({
        filename: att.filename,
        notes: 'Review manually'
      })),
      complianceIssues: [`AI analysis failed: ${error.message}`, 'Manual review required'],
      strengths: [],
      recommendation: 'request_more_info',
      recommendationReason: 'Automated analysis unavailable - requires manual review'
    }
  }
}

/**
 * Format analysis result as a review note for SheepCRM
 */
export function formatAssessorReviewNote(analysis: AssessorAnalysisResult): string {
  const lines: string[] = []

  lines.push('**TRAINER/ASSESSOR APPLICATION REVIEW**')
  lines.push('')

  // Header
  lines.push(`**Applicant:** ${analysis.applicantName}`)
  lines.push(`**Submission Date:** ${analysis.submissionDate}`)
  lines.push(`**Review Date:** ${new Date().toISOString().split('T')[0]}`)
  lines.push('')

  // Summary
  lines.push('**Summary:**')
  lines.push(analysis.summary)
  lines.push('')

  // Required Documents
  lines.push('**Required Documents Checklist:**')
  analysis.requiredDocuments.forEach(doc => {
    const status = doc.present ? '✅' : '❌'
    lines.push(`${status} ${doc.name}`)
    if (doc.notes) {
      lines.push(`   ↳ ${doc.notes}`)
    }
  })
  lines.push('')

  // Additional Documents
  if (analysis.additionalDocuments.length > 0) {
    lines.push('**Additional Documents Uploaded:**')
    analysis.additionalDocuments.forEach(doc => {
      lines.push(`📎 ${doc.filename}`)
      if (doc.notes) {
        lines.push(`   ↳ ${doc.notes}`)
      }
    })
    lines.push('')
  }

  // Strengths
  if (analysis.strengths.length > 0) {
    lines.push('**✅ Strengths:**')
    analysis.strengths.forEach(strength => {
      lines.push(`- ${strength}`)
    })
    lines.push('')
  }

  // Compliance Issues
  if (analysis.complianceIssues.length > 0) {
    lines.push('**⚠️ Issues/Concerns:**')
    analysis.complianceIssues.forEach(issue => {
      lines.push(`- ${issue}`)
    })
    lines.push('')
  }

  // Recommendation
  lines.push('**RECOMMENDATION:**')
  const recommendationLabel = {
    approve: '✅ APPROVE',
    request_more_info: '⚠️ REQUEST MORE INFORMATION',
    reject: '❌ REJECT'
  }[analysis.recommendation]

  lines.push(`**${recommendationLabel}**`)
  lines.push('')
  lines.push(analysis.recommendationReason)
  lines.push('')

  // Footer
  lines.push('─────────────────────────────')
  lines.push('*Auto-generated by FAIB Internal Tools*')

  return lines.join('\n')
}
