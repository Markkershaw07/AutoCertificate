'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'

// Updated: Removed Size column and improved company name wrapping

interface LicenceFile {
  name: string
  path: string
  createdAt: string
  size: number
  metadata?: {
    company_name: string
    company_address: string
    licence_number: string
    membership_start_date: string
    membership_end_date: string
  }
}

interface ApiResponse {
  ok: boolean
  items: LicenceFile[]
  page: number
  limit: number
  total: number
  nextPageAvailable: boolean
  error?: string
}

export default function LicencesPage() {
  const [licences, setLicences] = useState<LicenceFile[]>([])
  const [page, setPage] = useState(1)
  const [nextPageAvailable, setNextPageAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const limit = 20

  // Filter licences client-side based on search term
  const filteredLicences = licences.filter(licence => {
    if (!searchTerm) return true

    const search = searchTerm.toLowerCase()
    const filename = licence.name.toLowerCase()
    const companyName = licence.metadata?.company_name?.toLowerCase() || ''
    const licenceNumber = licence.metadata?.licence_number?.toLowerCase() || ''

    return filename.includes(search) ||
           companyName.includes(search) ||
           licenceNumber.includes(search)
  })

  const fetchLicences = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('[PAGE] Fetching licences from API:', `/api/licences?page=${page}&limit=${limit}`)
      const response = await fetch(`/api/licences?page=${page}&limit=${limit}`)
      console.log('[PAGE] Response status:', response.status, response.statusText)

      const data: ApiResponse = await response.json()
      console.log('[PAGE] Response data:', JSON.stringify(data, null, 2))

      if (!response.ok) {
        console.error('[PAGE] API returned error:', data)
        throw new Error(data.error || 'Failed to fetch licences')
      }

      console.log('[PAGE] Setting licences. Items count:', data.items?.length || 0)
      console.log('[PAGE] First item:', data.items?.[0])
      setLicences(data.items)
      setNextPageAvailable(data.nextPageAvailable)
    } catch (err: any) {
      console.error('[PAGE] Error fetching licences:', err)
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    fetchLicences()
  }, [fetchLicences])

  const handleDownload = async (licence: LicenceFile) => {
    setDownloadingPath(licence.path)

    try {
      // Get signed URL
      const response = await fetch('/api/licences/sign-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: licence.path }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate download URL')
      }

      // Fetch the file as a blob to force download
      const pdfResponse = await fetch(data.url)

      if (!pdfResponse.ok) {
        throw new Error('Failed to fetch PDF file')
      }

      const blob = await pdfResponse.blob()
      const blobUrl = URL.createObjectURL(blob)

      // Construct custom filename: {Company Name} {Licence Number}.pdf
      let customFilename = licence.name // fallback to original name

      if (licence.metadata?.company_name && licence.metadata?.licence_number) {
        // Sanitize company name and licence number for filename
        const sanitizedCompany = licence.metadata.company_name.replace(/[^a-zA-Z0-9\s-]/g, '').trim()
        const sanitizedLicence = licence.metadata.licence_number.replace(/[^a-zA-Z0-9-]/g, '').trim()
        customFilename = `${sanitizedCompany} ${sanitizedLicence}.pdf`
      }

      // Trigger download with blob URL
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = customFilename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up blob URL
      URL.revokeObjectURL(blobUrl)

    } catch (err: any) {
      console.error('Download error:', err)
      alert(err.message || 'Failed to download file')
    } finally {
      setDownloadingPath(null)
    }
  }

  const handleDelete = async (licence: LicenceFile) => {
    // Confirmation dialog
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the licence for ${licence.metadata?.company_name || licence.name}?\n\nThis action cannot be undone.`
    )

    if (!confirmDelete) {
      return
    }

    setDeletingPath(licence.path)

    try {
      const response = await fetch('/api/licences', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: licence.path }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete licence')
      }

      // Refresh the list after successful deletion
      await fetchLicences()

    } catch (err: any) {
      console.error('Delete error:', err)
      alert(err.message || 'Failed to delete licence')
    } finally {
      setDeletingPath(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      <PageHeader
        title="Licences"
        description={`Manage all training provider licences (${licences.length} total)`}
        action={
          <Link href="/" className="btn-primary text-sm">
            Generate New Licence
          </Link>
        }
      />

      <div className="space-y-6">
        {/* Search and Filter Card */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <label htmlFor="search" className="text-sm font-semibold text-neutral-black">
              Search Licences
            </label>
          </div>
          <input
            type="text"
            id="search"
            placeholder="Search by company name, licence number, or filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-3 text-sm text-primary hover:text-primary-light font-semibold transition-colors"
            >
              Clear search
            </button>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-white border-l-4 border-accent-red rounded-lg shadow-md p-6">
            <div className="flex items-start">
              <svg className="h-7 w-7 text-accent-red flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-accent-red mb-2">Error Loading Licences</h3>
                <p className="text-neutral-black text-base">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="card text-center py-12">
            <svg className="animate-spin h-10 w-10 text-primary mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-neutral-black font-medium">Loading licences...</p>
          </div>
        ) : licences.length === 0 ? (
          /* Empty State */
          <div className="card text-center py-16">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-navy mb-2">No Licences Yet</h3>
            <p className="text-neutral-black opacity-70 mb-6">Get started by generating your first licence</p>
            <Link href="/" className="btn-primary inline-block">
              Generate First Licence
            </Link>
          </div>
        ) : filteredLicences.length === 0 ? (
          /* No Search Results */
          <div className="card text-center py-12">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-navy mb-2">No Results Found</h3>
            <p className="text-neutral-black opacity-70 mb-4">
              No licences match your search for: {searchTerm}
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="text-primary hover:text-primary-light font-semibold"
            >
              Clear search and view all licences
            </button>
          </div>
        ) : (
          /* Licences Table */
          <>
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-grey border-b-2 border-gray-300">
                    <tr>
                      <th className="text-left py-3 px-3 lg:py-5 lg:px-8 font-bold text-primary text-xs lg:text-sm uppercase tracking-wide whitespace-nowrap">
                        Training Provider
                      </th>
                      <th className="text-left py-3 px-3 lg:py-5 lg:px-8 font-bold text-primary text-xs lg:text-sm uppercase tracking-wide whitespace-nowrap">
                        Licence #
                      </th>
                      <th className="text-left py-3 px-3 lg:py-5 lg:px-8 font-bold text-primary text-xs lg:text-sm uppercase tracking-wide whitespace-nowrap">
                        Created
                      </th>
                      <th className="text-right py-3 px-3 lg:py-5 lg:px-8 font-bold text-primary text-xs lg:text-sm uppercase tracking-wide whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLicences.map((licence) => (
                      <tr key={licence.path} className="hover:bg-secondary/15 transition-colors duration-150">
                        <td className="py-3 px-3 lg:py-5 lg:px-8">
                          <div className="text-neutral-black font-semibold text-sm lg:text-base max-w-xs">
                            {licence.metadata?.company_name || 'N/A'}
                          </div>
                          {licence.metadata && (
                            <div className="text-xs text-gray-500 mt-1 max-w-[150px] lg:max-w-xs truncate">{licence.name}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 lg:py-5 lg:px-8">
                          <span className="inline-flex items-center px-2 py-1 lg:px-3 rounded-full text-xs lg:text-sm font-semibold bg-secondary/25 text-primary whitespace-nowrap">
                            {licence.metadata?.licence_number || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-3 lg:py-5 lg:px-8 text-neutral-black text-xs lg:text-sm whitespace-nowrap">
                          {formatDate(licence.createdAt)}
                        </td>
                        <td className="py-3 px-3 lg:py-5 lg:px-8 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleDownload(licence)}
                              disabled={downloadingPath === licence.path || deletingPath === licence.path}
                              className="bg-primary hover:bg-[#2d6a68] hover:shadow-md text-white py-2 px-3 lg:px-5 rounded-lg font-semibold text-xs lg:text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed inline-flex items-center whitespace-nowrap min-h-[44px]"
                            >
                              {downloadingPath === licence.path ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Downloading...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Download
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(licence)}
                              disabled={deletingPath === licence.path || downloadingPath === licence.path}
                              className="bg-accent-red hover:bg-red-700 hover:shadow-md text-white py-2 px-3 lg:px-5 rounded-lg font-semibold text-xs lg:text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-red focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed inline-flex items-center whitespace-nowrap min-h-[44px]"
                              title="Delete licence"
                            >
                              {deletingPath === licence.path ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Deleting...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {(page > 1 || nextPageAvailable) && (
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white hover:shadow-md disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white disabled:cursor-not-allowed py-2.5 px-6 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Previous
                </button>

                <span className="text-neutral-black font-medium text-base">
                  Page <span className="text-primary font-bold text-lg">{page}</span>
                </span>

                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!nextPageAvailable}
                  className="bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white hover:shadow-md disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white disabled:cursor-not-allowed py-2.5 px-6 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
