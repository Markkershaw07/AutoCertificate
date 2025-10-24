'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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
}

export default function LicencesPage() {
  const [licences, setLicences] = useState<LicenceFile[]>([])
  const [page, setPage] = useState(1)
  const [nextPageAvailable, setNextPageAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null)
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

  useEffect(() => {
    fetchLicences()
  }, [page])

  const fetchLicences = async () => {
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
  }

  const handleDownload = async (filePath: string, fileName: string) => {
    setDownloadingPath(filePath)

    try {
      // Get signed URL
      const response = await fetch('/api/licences/sign-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: filePath }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate download URL')
      }

      // Trigger download
      const link = document.createElement('a')
      link.href = data.url
      link.download = fileName
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

    } catch (err: any) {
      console.error('Download error:', err)
      alert(err.message || 'Failed to download file')
    } finally {
      setDownloadingPath(null)
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

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50">
      <div className="w-full max-w-6xl bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Licences</h1>
          <Link
            href="/"
            className="bg-blue-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Generate New
          </Link>
        </div>

        {/* Search Input */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by company name, licence number, or filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading licences...</p>
          </div>
        ) : licences.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No licences found</p>
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Generate your first licence
            </Link>
          </div>
        ) : filteredLicences.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No licences match your search</p>
            <button
              onClick={() => setSearchTerm('')}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Clear search
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Company</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Licence #</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Size</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLicences.map((licence) => (
                    <tr key={licence.path} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="text-gray-900 font-medium">
                          {licence.metadata?.company_name || 'N/A'}
                        </div>
                        {licence.metadata && (
                          <div className="text-xs text-gray-500 mt-1">{licence.name}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {licence.metadata?.licence_number || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(licence.createdAt)}</td>
                      <td className="py-3 px-4 text-gray-600">{formatSize(licence.size)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDownload(licence.path, licence.name)}
                          disabled={downloadingPath === licence.path}
                          className="bg-green-600 text-white py-1 px-4 rounded-md font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors text-sm"
                        >
                          {downloadingPath === licence.path ? 'Downloading...' : 'Download'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="bg-gray-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              <span className="text-gray-700 font-medium">
                Page {page}
              </span>

              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!nextPageAvailable}
                className="bg-gray-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
