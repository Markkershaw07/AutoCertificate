import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import CloudConvert from 'cloudconvert'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

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

    // Validate Supabase bucket env var
    if (!process.env.SUPABASE_BUCKET) {
      return NextResponse.json(
        { error: 'SUPABASE_BUCKET environment variable not configured' },
        { status: 500 }
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

    // Get the zip object to modify font sizes if needed
    const modifiedZip = doc.getZip()

    // Adjust font size based on company name length
    if (company_name.length > 35) {
      try {
        // Get the slide XML (usually slide1.xml)
        const slideXml = modifiedZip.files['ppt/slides/slide1.xml']?.asText()

        if (slideXml) {
          // Determine font size based on length (in half-points: 1pt = 200 half-points)
          let fontSize = 5600 // Default 28pt
          if (company_name.length > 43) {
            fontSize = 4000 // 20pt for very long names (43+ chars)
          } else if (company_name.length > 35) {
            fontSize = 4800 // 24pt for moderately long names (35-43 chars)
          }

          // Escape company name for regex to handle special characters
          const escapedName = company_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

          // Strategy: Find the company name in the XML and replace font sizes in that section
          // Split the name into parts to handle potential multi-run text
          const nameParts = escapedName.split(/\s+/)
          const firstPart = nameParts[0]

          // Find the section of XML containing the company name
          const nameStartIndex = slideXml.indexOf(`<a:t>${company_name}</a:t>`)
          const nameStartIndexPartial = slideXml.indexOf(`<a:t>${firstPart}`)

          let modifiedSlideXml = slideXml

          if (nameStartIndex !== -1) {
            // Company name is in a single text run - easier case
            // Find the <a:sz> tag before this text
            const beforeText = slideXml.substring(0, nameStartIndex)
            const lastSzIndex = beforeText.lastIndexOf('<a:sz val="')

            if (lastSzIndex !== -1) {
              const szEndIndex = slideXml.indexOf('"', lastSzIndex + 11)
              const beforeSz = slideXml.substring(0, lastSzIndex + 11)
              const afterSz = slideXml.substring(szEndIndex)
              modifiedSlideXml = beforeSz + fontSize + afterSz
            }
          } else if (nameStartIndexPartial !== -1) {
            // Company name might be split across runs - replace all font sizes in that region
            // Get a range around where the name appears (500 chars before and after)
            const rangeStart = Math.max(0, nameStartIndexPartial - 500)
            const rangeEnd = Math.min(slideXml.length, nameStartIndexPartial + company_name.length + 500)
            const textRange = slideXml.substring(rangeStart, rangeEnd)

            // Replace all <a:sz val="XXXX"/> in this range
            const modifiedRange = textRange.replace(/<a:sz val="\d+"/g, `<a:sz val="${fontSize}"`)

            modifiedSlideXml = slideXml.substring(0, rangeStart) + modifiedRange + slideXml.substring(rangeEnd)
          }

          // Update the slide in the zip
          modifiedZip.file('ppt/slides/slide1.xml', modifiedSlideXml)

          console.log(`[Font Adjustment] Set company name font to ${fontSize/200}pt for "${company_name}" (${company_name.length} chars)`)
        }
      } catch (err) {
        console.error('Error adjusting font size:', err)
        // Continue anyway - template will use default size
      }
    }

    // Generate filled PPTX buffer
    const filledPptxBuffer = modifiedZip.generate({
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

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())

    // Build storage path: licences/<year>/<sanitized_company>__<licence_number>__<YYYY-MM-DD>.pdf
    const year = new Date(membership_start_date).getFullYear()
    const sanitizedCompany = company_name.replace(/[^a-zA-Z0-9_-]/g, '_')
    const dateStamp = new Date().toISOString().split('T')[0]
    const storagePath = `licences/${year}/${sanitizedCompany}__${licence_number}__${dateStamp}.pdf`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload PDF to storage', details: uploadError.message },
        { status: 500 }
      )
    }

    // Upload JSON sidecar with metadata
    const metadataJson = JSON.stringify({
      company_name,
      company_address,
      licence_number,
      membership_start_date,
      membership_end_date
    })

    const { error: metaUploadError } = await supabaseAdmin
      .storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(storagePath + '.json', metadataJson, {
        contentType: 'application/json',
        upsert: true
      })

    if (metaUploadError) {
      console.error('Metadata sidecar upload error:', metaUploadError)
      // Non-fatal: continue even if metadata upload fails
    }

    // Generate 5-minute signed URL
    const { data: signedData, error: signedError } = await supabaseAdmin
      .storage
      .from(process.env.SUPABASE_BUCKET)
      .createSignedUrl(storagePath, 300) // 300 seconds = 5 minutes

    if (signedError || !signedData?.signedUrl) {
      console.error('Signed URL error:', signedError)
      return NextResponse.json(
        { error: 'Failed to generate signed URL', details: signedError?.message },
        { status: 500 }
      )
    }

    // Return success response
    return NextResponse.json({
      ok: true,
      path: storagePath,
      signedUrl: signedData.signedUrl,
      meta: {
        company_name,
        licence_number,
        membership_start_date,
        membership_end_date
      }
    })

  } catch (error: any) {
    console.error('Error generating and saving licence:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate and save licence',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
