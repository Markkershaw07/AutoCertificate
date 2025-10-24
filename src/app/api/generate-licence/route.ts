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

// Format address to wrap at commas after ~30 characters (max 2 lines)
function formatAddress(address: string): string {
  // Split address by commas
  const parts = address.split(',').map(part => part.trim())

  if (parts.length === 0) return address

  let firstLine = parts[0]
  let splitIndex = 1

  // Build first line up to ~30 characters
  for (let i = 1; i < parts.length; i++) {
    const testLine = firstLine + ', ' + parts[i]
    if (testLine.length > 30) {
      // This would exceed 30 chars, so stop here
      splitIndex = i
      break
    }
    firstLine = testLine
    splitIndex = i + 1
  }

  // If all parts fit in first line, return as is
  if (splitIndex >= parts.length) {
    return address
  }

  // Put remaining parts on second line
  const secondLine = parts.slice(splitIndex).join(', ')

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
