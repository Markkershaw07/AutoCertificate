/**
 * AI Analysis Service
 * Uses Claude AI to analyze renewal form submissions and generate summary notes
 */

import Anthropic from '@anthropic-ai/sdk'

export interface RenewalFormData {
  certificatesIssued: number
  numberOfTrainers: number
  trainerNames: string[]
  formAnswers: Record<string, any> // Raw form responses from SheepCRM
  organizationName: string
}

export interface AnalysisResult {
  summary: string
  missingItems: string[]
  complianceIssues: string[]
  trainerDetails: string
  certificateCount: number
  trainerCount: number
}

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
  // Remove markdown code blocks if present
  let jsonText = text.trim()

  // Check for ```json ... ``` or ``` ... ```
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  }

  return JSON.parse(jsonText)
}

/**
 * Analyze renewal form submission using Claude AI
 */
export async function analyzeRenewalForm(
  formData: RenewalFormData
): Promise<AnalysisResult> {
  const client = createAnthropicClient()

  const prompt = `You are analyzing a training provider renewal form submission for FAIB (First Aid Industry Body).

FORM SUBMISSION DATA:
Organization: ${formData.organizationName}
Certificates Issued: ${formData.certificatesIssued}
Number of Trainers: ${formData.numberOfTrainers}
Trainer Names: ${formData.trainerNames.join(', ')}

FORM ANSWERS:
${JSON.stringify(formData.formAnswers, null, 2)}

TASK:
Provide a summary of what the training provider HAS submitted. Focus on what they HAVE done, not what they haven't.

CRITICAL RULES - READ CAREFULLY:
- The form data shows checkbox arrays containing items that WERE checked by the user
- You MUST NOT mention ANY compliance items that don't appear in the FORM ANSWERS above
- You MUST NOT use your knowledge of FAIB requirements to infer what "should" be there
- ONLY flag issues based on what you can SEE in the actual form data
- Do NOT mention checkboxes that aren't visible in the data structure
- Leave missingItems empty [] unless you can clearly see an option exists but wasn't checked

SPECIAL CHECKS:
- FAIB Books: Look in the FORM ANSWERS for "teachingMaterialsUsed" field. This will be an array of strings representing the checkboxes that were checked. Check if ANY item in this array contains the text "FAIB First Aid books" or "new FAIB" (case-insensitive). If the array exists AND contains this text, they ARE using FAIB books - DO NOT FLAG THIS. ONLY flag as a compliance issue if the teachingMaterialsUsed field exists but does NOT contain any reference to FAIB books.
- Blended Courses: Note if they run blended courses
- Name discrepancies: Flag any mismatches between form data and organization name

WHAT TO FOCUS ON - complianceIssues:
- ONLY flag issues you can see in the actual form responses
- Name discrepancies (form vs organization name)
- If FAIB books are NOT being used (check teachingMaterialsUsed array carefully)
- Manual systems with high certificate volumes
- Do NOT make up compliance requirements not in the form

REMEMBER: If teachingMaterialsUsed array contains any reference to "FAIB" or "FAIB books", they ARE using FAIB books. This is GOOD and should NOT be flagged as an issue.

Provide your analysis in this exact JSON format:
{
  "summary": "Brief 2-3 sentence overview emphasizing what they HAVE submitted",
  "missingItems": [],
  "complianceIssues": ["Issue 1", "Issue 2", ...],
  "trainerDetails": "Summary of trainer information (names, count, any issues)"
}

When in doubt, do NOT add items to missingItems. Focus on the positive (what's there) rather than negative (what's not).`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
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

    // Parse the JSON response (handling markdown code blocks)
    let analysis
    try {
      analysis = extractJSON(content.text)
    } catch (parseError: any) {
      console.error('JSON parsing error. Raw response:', content.text)
      throw new Error(`Failed to parse Claude response as JSON: ${parseError.message}`)
    }

    return {
      summary: analysis.summary || '',
      missingItems: analysis.missingItems || [],
      complianceIssues: analysis.complianceIssues || [],
      trainerDetails: analysis.trainerDetails || '',
      certificateCount: formData.certificatesIssued,
      trainerCount: formData.numberOfTrainers
    }
  } catch (error: any) {
    console.error('AI analysis error:', error)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.substring(0, 500)
    })

    // Fallback: provide basic analysis without AI
    // Include error message for debugging
    const errorMessage = error.message || 'Unknown error'
    return {
      summary: `Renewal submission received for ${formData.organizationName}`,
      missingItems: [],
      complianceIssues: [`AI analysis failed: ${errorMessage}`, 'Manual review required'],
      trainerDetails: `${formData.numberOfTrainers} trainer(s): ${formData.trainerNames.join(', ')}`,
      certificateCount: formData.certificatesIssued,
      trainerCount: formData.numberOfTrainers
    }
  }
}

/**
 * Format analysis result as a note for SheepCRM
 */
export function formatAnalysisNote(
  analysis: AnalysisResult,
  pricingBreakdown: string,
  certificateBreakdown?: {
    efaw?: number
    faw?: number
    fawr?: number
    pfa?: number
    emergencyPfa?: number
    outdoorFirstAid?: number
    emergencyOutdoorFirstAid?: number
    fawPfa?: number
    fawEpfa?: number
    efawEpfa?: number
    pfaEfaw?: number
    firstAidAnnualRefresher?: number
    blsAed?: number
    fawForestry?: number
    efawForestry?: number
    forestSchoolsFirstAid?: number
    emergencyForestSchoolsFirstAid?: number
    total: number
  }
): string {
  const lines: string[] = []

  lines.push('**RENEWAL FORM SUBMISSION ANALYSIS**')
  lines.push('')

  // Summary
  lines.push('**Summary:**')
  lines.push(analysis.summary)
  lines.push('')

  // Key Metrics
  lines.push('**Key Metrics:**')
  lines.push(`- Certificates Issued: ${analysis.certificateCount.toLocaleString()}`)
  lines.push(`- Trainers Renewing: ${analysis.trainerCount}`)
  lines.push('')

  // Certificate Breakdown
  if (certificateBreakdown) {
    lines.push('**Certificate Breakdown:**')

    const certMap: Record<string, string> = {
      efaw: 'EFAW',
      faw: 'FAW',
      fawr: 'FAWR Requalification',
      pfa: 'PFA',
      emergencyPfa: 'Emergency PFA',
      outdoorFirstAid: 'Outdoor First Aid',
      emergencyOutdoorFirstAid: 'Emergency Outdoor First Aid',
      fawPfa: 'FAW + PFA',
      fawEpfa: 'FAW + EPFA',
      efawEpfa: 'EFAW + EPFA',
      pfaEfaw: 'PFA + EFAW',
      firstAidAnnualRefresher: 'First Aid Annual Refresher',
      blsAed: 'BLS + AED',
      fawForestry: 'FAW + Forestry',
      efawForestry: 'EFAW + Forestry',
      forestSchoolsFirstAid: 'Forest Schools First Aid',
      emergencyForestSchoolsFirstAid: 'Emergency Forest Schools First Aid'
    }

    let hasCertificates = false
    for (const [key, label] of Object.entries(certMap)) {
      const count = certificateBreakdown[key as keyof typeof certificateBreakdown]
      if (count && count > 0) {
        lines.push(`- ${label}: ${count.toLocaleString()}`)
        hasCertificates = true
      }
    }

    if (hasCertificates) {
      lines.push('')
      lines.push('*Note: Any negative numbers in the form have been converted to positive values.*')
    }

    lines.push('')
  }

  // Trainer Details
  if (analysis.trainerDetails) {
    lines.push('**Trainers:**')
    lines.push(analysis.trainerDetails)
    lines.push('')
  }

  // Missing Items
  if (analysis.missingItems.length > 0) {
    lines.push('**⚠️ Missing/Unchecked Items:**')
    analysis.missingItems.forEach(item => {
      lines.push(`- ${item}`)
    })
    lines.push('')
  }

  // Compliance Issues
  if (analysis.complianceIssues.length > 0) {
    lines.push('**⚠️ Compliance Issues:**')
    analysis.complianceIssues.forEach(issue => {
      lines.push(`- ${issue}`)
    })
    lines.push('')
  }

  // Pricing Breakdown
  lines.push('')
  lines.push(pricingBreakdown)
  lines.push('')

  // Footer
  lines.push('─────────────────────────────')
  lines.push('*Auto-generated by FAIB Internal Tools*')

  return lines.join('\n')
}
