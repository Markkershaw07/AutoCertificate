import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import CloudConvert from 'cloudconvert'

export const runtime = 'nodejs'

// Format date as "dd/mm/yyyy"
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Format address to wrap at commas (top line shorter, bottom line longer)
function formatAddress(address: string): string {
  // Split address by commas
  const parts = address.split(',').map(part => part.trim())

  // If only one part or address is short, keep on one line
  if (parts.length <= 1 || address.length < 50) {
    return address
  }

  // Try to find split point where first line is 35-45% of total length
  const targetFirstLineLength = address.length * 0.4
  let bestSplitIndex = 1
  let bestDifference = Math.abs(parts[0].length - targetFirstLineLength)

  // Try each possible split point
  for (let i = 1; i < parts.length; i++) {
    const firstLine = parts.slice(0, i).join(', ')
    const difference = Math.abs(firstLine.length - targetFirstLineLength)

    // If this split is closer to target, use it
    if (difference < bestDifference) {
      bestDifference = difference
      bestSplitIndex = i
    }
  }

  // Build the two lines
  const firstLine = parts.slice(0, bestSplitIndex).join(', ')
  const secondLine = parts.slice(bestSplitIndex).join(', ')

  return firstLine + ',\n' + secondLine
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const { company_name, company_address, licence_number, membership_start_date, membership_end_date } = body

    if (!company_name || !company_address || !licence_number || !membership_start_date || !membership_end_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Format membership period
    const startFormatted = formatDate(membership_start_date)
    const endFormatted = formatDate(membership_end_date)
    const membership_period = `${startFormatted} – ${endFormatted}`

    // Format address with line breaks at commas
    const formattedAddress = formatAddress(company_address)

    // Load PPTX template
    const templatePath = path.join(process.cwd(), 'templates', 'licence_template.pptx')

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: 'Template file not found at /templates/licence_template.pptx' },
        { status: 404 }
      )
    }

    const content = fs.readFileSync(templatePath, 'binary')
    const zip = new PizZip(content)

    // Adjust font size BEFORE template rendering based on company name length
    if (company_name.length > 35) {
      try {
        // Get the slide XML (usually slide1.xml)
        const slideXml = zip.files['ppt/slides/slide1.xml']?.asText()

        if (slideXml) {
          // Determine font size based on length (in half-points: 1pt = 200 half-points)
          let fontSize = 5600 // Default 28pt
          if (company_name.length > 55) {
            fontSize = 3400 // 17pt for extremely long names (55+ chars)
          } else if (company_name.length > 50) {
            fontSize = 3800 // 19pt for very long names (50-55 chars)
          } else if (company_name.length > 43) {
            fontSize = 4200 // 21pt for long names (43-50 chars)
          } else if (company_name.length > 35) {
            fontSize = 4800 // 24pt for moderately long names (35-43 chars)
          }

          console.log(`[Font Adjustment] Company name length: ${company_name.length} chars, setting font to ${fontSize/200}pt`)

          // Find the placeholder - it may be split across multiple XML runs
          // Look for just "company_name" text instead of the full {{company_name}}
          const placeholderIndex = slideXml.indexOf('company_name')

          let modifiedSlideXml = slideXml

          if (placeholderIndex !== -1) {
            console.log(`[Font Adjustment] Found company_name placeholder text at position ${placeholderIndex}`)

            // Strategy: Replace ALL font sizes in a wide range around the placeholder
            // PowerPoint often splits {{company_name}} into multiple text runs
            // Look backwards up to 2000 characters to catch all related font definitions
            const searchStart = Math.max(0, placeholderIndex - 2000)
            const searchEnd = Math.min(slideXml.length, placeholderIndex + 500)
            const searchRange = slideXml.substring(searchStart, searchEnd)

            // Find and replace ALL <a:sz val="XXXX"/> tags in this range
            const fontSizeRegex = /<a:sz val="\d+"/g
            const matches = searchRange.match(fontSizeRegex)

            if (matches && matches.length > 0) {
              console.log(`[Font Adjustment] Found ${matches.length} font size tags near placeholder, replacing all`)

              // Replace all font sizes in the range with the target size
              const modifiedRange = searchRange.replace(fontSizeRegex, `<a:sz val="${fontSize}"`)
              modifiedSlideXml = slideXml.substring(0, searchStart) + modifiedRange + slideXml.substring(searchEnd)

              console.log(`[Font Adjustment] Replaced ${matches.length} font size tags from various sizes to ${fontSize}`)
            } else {
              console.log(`[Font Adjustment] Could not find any font size tags near placeholder`)
            }
          } else {
            console.log(`[Font Adjustment] Could not find company_name placeholder text in template`)
          }

          // Update the slide in the zip
          zip.file('ppt/slides/slide1.xml', modifiedSlideXml)

          console.log(`[Font Adjustment] Successfully set company name font to ${fontSize/200}pt for "${company_name}" (${company_name.length} chars)`)
        }
      } catch (err) {
        console.error('[Font Adjustment] Error adjusting font size:', err)
        // Continue anyway - template will use default size
      }
    }

    // Configure Docxtemplater with {{}} delimiters
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' }
    })

    // Replace placeholders
    doc.render({
      company_name,
      company_address: formattedAddress,
      licence_number,
      membership_period
    })

    // Generate filled PPTX buffer
    const filledPptxBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    })

    // Validate CloudConvert API key
    if (!process.env.CLOUDCONVERT_API_KEY) {
      return NextResponse.json(
        { error: 'CloudConvert API key not configured' },
        { status: 500 }
      )
    }

    // Initialize CloudConvert
    const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY)

    // Create conversion job
    let job
    try {
      job = await cloudConvert.jobs.create({
        tasks: {
          'upload-pptx': {
            operation: 'import/upload'
          },
          'convert-to-pdf': {
            operation: 'convert',
            input: 'upload-pptx',
            output_format: 'pdf'
          },
          'export-pdf': {
            operation: 'export/url',
            input: 'convert-to-pdf'
          }
        }
      })
    } catch (ccError: any) {
      console.error('CloudConvert job creation failed:', ccError)
      return NextResponse.json(
        {
          error: 'CloudConvert job creation failed',
          details: ccError.message || 'Invalid API key or job configuration'
        },
        { status: 500 }
      )
    }

    // Upload filled PPTX
    const uploadTask = job.tasks.filter(task => task.name === 'upload-pptx')[0]
    await cloudConvert.tasks.upload(uploadTask, filledPptxBuffer, 'licence.pptx')

    // Wait for job completion
    job = await cloudConvert.jobs.wait(job.id)

    // Get export task
    const exportTask = job.tasks.filter(task => task.name === 'export-pdf')[0]

    if (!exportTask?.result?.files?.[0]?.url) {
      return NextResponse.json(
        { error: 'PDF conversion failed - no output file' },
        { status: 500 }
      )
    }

    // Download PDF
    const pdfFile = exportTask.result.files[0]
    const pdfUrl = pdfFile.url!
    const pdfResponse = await fetch(pdfUrl)

    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to download converted PDF' },
        { status: 500 }
      )
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()

    // Return PDF with download headers
    const sanitizedCompanyName = company_name.replace(/[^a-zA-Z0-9_-]/g, '_')
    const filename = `licence_${sanitizedCompanyName}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error: any) {
    console.error('Error generating licence:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate licence',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
