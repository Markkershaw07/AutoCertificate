import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Validate Supabase bucket env var
    if (!process.env.SUPABASE_BUCKET) {
      return NextResponse.json(
        { error: 'SUPABASE_BUCKET environment variable not configured' },
        { status: 500 }
      )
    }

    console.log('[API] ============================================')
    console.log('[API] Bucket name:', process.env.SUPABASE_BUCKET)
    console.log('[API] Listing files from: licences/')

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    console.log('[API] Pagination: page=', page, 'limit=', limit)

    // Validate pagination params
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Invalid pagination parameters (page >= 1, limit 1-100)' },
        { status: 400 }
      )
    }

    // Calculate offset
    const offset = (page - 1) * limit

    // First, list year folders in licences/
    console.log('[API] Step 1: Listing year folders in "licences/"...')
    const { data: yearFolders, error: folderError } = await supabaseAdmin
      .storage
      .from(process.env.SUPABASE_BUCKET)
      .list('licences', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (folderError) {
      console.error('Supabase list error:', folderError)
      return NextResponse.json(
        { error: 'Failed to list folders', details: folderError.message },
        { status: 500 }
      )
    }

    // Collect all PDF files from all year folders
    const allFiles: Array<{ name: string; path: string; created_at: string; metadata: any }> = []

    console.log('[API] Year folders/items found:', yearFolders?.length || 0)
    if (yearFolders && yearFolders.length > 0) {
      console.log('[API] First item example:', JSON.stringify(yearFolders[0], null, 2))
      console.log('[API] All items:', yearFolders.map(f => ({ name: f.name, id: f.id, metadata: f.metadata })))
    }

    if (yearFolders && yearFolders.length > 0) {
      for (const folder of yearFolders) {
        console.log('[API] Processing item:', folder.name, 'id:', folder.id, 'metadata:', folder.metadata)

        // In Supabase Storage:
        // - Folders (prefixes) typically have id: null
        // - Files have a non-null id
        // However, let's check both ways to be safe

        // Check if this looks like a year folder (e.g., "2024", "2025")
        const isYearFolder = /^\d{4}$/.test(folder.name)

        if (!isYearFolder && folder.id) {
          // It's a file, not a year folder
          console.log('[API] Item is a file (has ID), not a year folder:', folder.name)

          // Skip .json metadata sidecar files
          if (folder.name.toLowerCase().endsWith('.json')) {
            console.log(`[API] Skipping .json metadata file: ${folder.name}`)
            continue
          }

          // Check if it's a PDF directly in licences/
          const hasPdfExtension = folder.name.toLowerCase().endsWith('.pdf')
          const hasPdfContentType = folder.metadata?.mimetype === 'application/pdf' ||
                                   folder.metadata?.contentType === 'application/pdf'

          // Accept if it has .pdf extension OR is marked as PDF content type OR just has an ID (fallback)
          const isPdf = hasPdfExtension || hasPdfContentType || folder.id

          if (isPdf) {
            if (!hasPdfExtension) {
              console.log(`[API] ⚠️  WARNING: File "${folder.name}" in licences/ doesn't have .pdf extension but is being included. ContentType:`, folder.metadata?.mimetype || folder.metadata?.contentType || 'unknown')
            }
            console.log('[API] Found PDF file directly in licences/:', folder.name)
            allFiles.push({
              name: folder.name,
              path: `licences/${folder.name}`,
              created_at: folder.created_at,
              metadata: folder.metadata
            })
          }
          continue
        }

        console.log('[API] Listing files in folder:', folder.name)

        // List files in this year folder
        const { data: filesInYear, error: filesError } = await supabaseAdmin
          .storage
          .from(process.env.SUPABASE_BUCKET)
          .list(`licences/${folder.name}`, {
            limit: 1000,
            sortBy: { column: 'created_at', order: 'desc' }
          })

        console.log(`[API] Files in ${folder.name}:`, filesInYear?.length || 0)

        // Log detailed info about each file found
        if (filesInYear && filesInYear.length > 0) {
          console.log(`[API] Detailed file list for ${folder.name}:`,
            filesInYear.map(f => ({
              name: f.name,
              id: f.id,
              metadata: f.metadata
            }))
          )
        }

        if (!filesError && filesInYear) {
          // Process each item in the year folder
          for (const item of filesInYear) {
            // If item has an ID, it's a file - process it directly
            if (item.id) {
              // Skip .json metadata sidecar files
              if (item.name.toLowerCase().endsWith('.json')) {
                console.log(`[API] Skipping .json metadata file: ${item.name}`)
                continue
              }

              const hasPdfExtension = item.name.toLowerCase().endsWith('.pdf')
              const hasPdfContentType = item.metadata?.mimetype === 'application/pdf' ||
                                       item.metadata?.contentType === 'application/pdf'
              const isPdf = hasPdfExtension || hasPdfContentType || item.id

              if (isPdf) {
                if (!hasPdfExtension) {
                  console.log(`[API] ⚠️  WARNING: File "${item.name}" doesn't have .pdf extension but is being included. ContentType:`, item.metadata?.mimetype || item.metadata?.contentType || 'unknown')
                }

                allFiles.push({
                  name: item.name,
                  path: `licences/${folder.name}/${item.name}`,
                  created_at: item.created_at,
                  metadata: item.metadata
                })
              }
            } else {
              // Item has no ID - it's a folder/prefix. Search inside it for actual files
              console.log(`[API] Found nested folder: ${item.name}. Searching inside...`)

              const { data: nestedFiles, error: nestedError } = await supabaseAdmin
                .storage
                .from(process.env.SUPABASE_BUCKET!)
                .list(`licences/${folder.name}/${item.name}`, {
                  limit: 1000,
                  sortBy: { column: 'created_at', order: 'desc' }
                })

              console.log(`[API] Files in nested folder ${item.name}:`, nestedFiles?.length || 0)

              if (nestedFiles && nestedFiles.length > 0) {
                console.log(`[API] Nested files in ${item.name}:`,
                  nestedFiles.map(f => ({
                    name: f.name,
                    id: f.id,
                    metadata: f.metadata
                  }))
                )
              }

              if (!nestedError && nestedFiles) {
                // Add all files from nested folder that have an ID (are actual files)
                for (const nestedFile of nestedFiles) {
                  if (nestedFile.id) {
                    // Skip .json metadata sidecar files
                    if (nestedFile.name.toLowerCase().endsWith('.json')) {
                      console.log(`[API] Skipping .json metadata file: ${nestedFile.name}`)
                      continue
                    }

                    const hasPdfExtension = nestedFile.name.toLowerCase().endsWith('.pdf')
                    const hasPdfContentType = nestedFile.metadata?.mimetype === 'application/pdf' ||
                                             nestedFile.metadata?.contentType === 'application/pdf'
                    const isPdf = hasPdfExtension || hasPdfContentType || nestedFile.id

                    if (isPdf) {
                      if (!hasPdfExtension) {
                        console.log(`[API] ⚠️  WARNING: Nested file "${nestedFile.name}" doesn't have .pdf extension but is being included. ContentType:`, nestedFile.metadata?.mimetype || nestedFile.metadata?.contentType || 'unknown')
                      }

                      allFiles.push({
                        name: nestedFile.name,
                        path: `licences/${folder.name}/${item.name}/${nestedFile.name}`,
                        created_at: nestedFile.created_at,
                        metadata: nestedFile.metadata
                      })
                    }
                  }
                }
              }
            }
          }

          console.log(`[API] Total files found in ${folder.name}:`, allFiles.length)
        }
      }
    }

    console.log('[API] Total files collected from licences/ prefix:', allFiles.length)

    // If no files found, try checking root of bucket as fallback
    if (allFiles.length === 0) {
      console.log('[API] No files found in licences/. Trying root of bucket...')
      const { data: rootFiles, error: rootError } = await supabaseAdmin
        .storage
        .from(process.env.SUPABASE_BUCKET)
        .list('', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      console.log('[API] Root files found:', rootFiles?.length || 0)

      // Log detailed info about root files
      if (rootFiles && rootFiles.length > 0) {
        console.log('[API] Detailed root file list:',
          rootFiles.map(f => ({
            name: f.name,
            id: f.id,
            metadata: f.metadata
          }))
        )
      }

      if (!rootError && rootFiles) {
        const rootPdfs = rootFiles
          .filter(file => {
            // Must be a file (has id), not a folder
            if (!file.id) return false

            // Skip .json metadata sidecar files
            if (file.name.toLowerCase().endsWith('.json')) {
              console.log(`[API] Skipping .json metadata file: ${file.name}`)
              return false
            }

            const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf')
            const hasPdfContentType = file.metadata?.mimetype === 'application/pdf' ||
                                     file.metadata?.contentType === 'application/pdf'

            // Accept if it has .pdf extension OR is marked as PDF content type OR just has an ID (fallback)
            const isPdf = hasPdfExtension || hasPdfContentType || file.id

            if (!hasPdfExtension && file.id) {
              console.log(`[API] ⚠️  WARNING: Root file "${file.name}" doesn't have .pdf extension but is being included. ContentType:`, file.metadata?.mimetype || file.metadata?.contentType || 'unknown')
            }

            return isPdf
          })
          .map(file => ({
            name: file.name,
            path: file.name,
            created_at: file.created_at,
            metadata: file.metadata
          }))

        console.log('[API] Root PDFs found:', rootPdfs.length)
        allFiles.push(...rootPdfs)
      }
    }

    console.log('[API] Total files collected (after all checks):', allFiles.length)

    // Sort all files by created_at DESC
    allFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Check if next page available
    const nextPageAvailable = allFiles.length > offset + limit

    // Apply pagination
    const pdfFilesToProcess = allFiles.slice(offset, offset + limit)

    // Fetch metadata for each file
    const items = await Promise.all(
      pdfFilesToProcess.map(async (file) => {
        const item: any = {
          name: file.name,
          path: file.path,
          createdAt: file.created_at,
          size: file.metadata?.size || 0
        }

        // Try to fetch JSON sidecar
        try {
          const { data: metaData, error: metaError } = await supabaseAdmin
            .storage
            .from(process.env.SUPABASE_BUCKET!)
            .download(file.path + '.json')

          if (!metaError && metaData) {
            const metaText = await metaData.text()
            const metadata = JSON.parse(metaText)
            item.metadata = metadata
          }
        } catch (err) {
          // No metadata available, continue without it
        }

        return item
      })
    )

    // Calculate total
    const total = allFiles.length

    console.log('[API] ============================================')
    console.log('[API] Final response:')
    console.log('[API]   - Total files found:', total)
    console.log('[API]   - Items in this page:', items.length)
    console.log('[API]   - Page:', page, 'of', Math.ceil(total / limit))
    console.log('[API] ============================================')

    return NextResponse.json({
      ok: true,
      items,
      page,
      limit,
      total,
      nextPageAvailable
    })

  } catch (error: any) {
    console.error('Error listing licences:', error)
    return NextResponse.json(
      {
        error: 'Failed to list licences',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Validate Supabase bucket env var
    if (!process.env.SUPABASE_BUCKET) {
      return NextResponse.json(
        { error: 'SUPABASE_BUCKET environment variable not configured' },
        { status: 500 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { path } = body

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing path parameter' },
        { status: 400 }
      )
    }

    console.log('[API DELETE] Deleting licence:', path)

    // Delete the PDF file
    const { error: deleteError } = await supabaseAdmin
      .storage
      .from(process.env.SUPABASE_BUCKET)
      .remove([path])

    if (deleteError) {
      console.error('[API DELETE] Error deleting PDF:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete licence', details: deleteError.message },
        { status: 500 }
      )
    }

    // Try to delete the metadata JSON file (don't fail if it doesn't exist)
    try {
      await supabaseAdmin
        .storage
        .from(process.env.SUPABASE_BUCKET)
        .remove([`${path}.json`])
      console.log('[API DELETE] Metadata file deleted')
    } catch (metaError) {
      console.log('[API DELETE] No metadata file to delete or error deleting it')
    }

    console.log('[API DELETE] Successfully deleted licence:', path)

    return NextResponse.json({
      ok: true,
      message: 'Licence deleted successfully'
    })

  } catch (error: any) {
    console.error('[API DELETE] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete licence',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
