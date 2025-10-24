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
      company_address,
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
