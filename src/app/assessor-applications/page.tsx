'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'

interface Application {
  uri: string
  id: string
  applicantName: string
  applicantUri: string
  submissionDate: string | null
  status: string
  hasInternalComments: boolean
  hasFeedback: boolean
}

export default function AssessorApplications() {
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      setIsLoading(true)
      setErrorMessage(null)

      const response = await fetch('/api/assessor-applications')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to fetch applications')
      }

      setApplications(data.applications)
    } catch (error: any) {
      console.error('Error fetching applications:', error)
      setErrorMessage(error.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter
    const matchesSearch = !searchQuery ||
      app.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesSearch
  })

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      submitted: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      started: 'bg-gray-100 text-gray-800',
      withdrawn: 'bg-yellow-100 text-yellow-800'
    }

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    )
  }

  return (
    <>
      <PageHeader
        title="Trainer/Assessor Applications"
        description="Review and manage trainer/assessor application submissions"
        action={
          <Link href="/" className="btn-secondary text-sm">
            Generate Licence
          </Link>
        }
      />

      <div className="max-w-7xl">
        {/* Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-semibold text-neutral-black mb-2">
                Search Applications
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                placeholder="Search by name or ID..."
              />
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-neutral-black mb-2">
                Filter by Status
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="started">Started</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={fetchApplications}
              className="btn-secondary text-sm"
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh List'}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="card text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-600">Loading applications...</p>
          </div>
        )}

        {/* Error State */}
        {errorMessage && (
          <div className="bg-white border-l-4 border-accent-red rounded-lg shadow-md p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-7 w-7 text-accent-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-accent-red mb-2">Error</h3>
                <p className="text-neutral-black text-base">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Applications List */}
        {!isLoading && !errorMessage && (
          <>
            <div className="card mb-4">
              <p className="text-sm text-gray-600">
                Showing <strong>{filteredApplications.length}</strong> of <strong>{applications.length}</strong> applications
              </p>
            </div>

            {filteredApplications.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-600">No applications found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((app) => (
                  <Link
                    key={app.id}
                    href={`/assessor-applications/${app.id}`}
                    className="card block hover:shadow-lg transition-shadow duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-navy mb-2">
                          {app.applicantName}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            <strong>Submission Date:</strong> {formatDate(app.submissionDate)}
                          </p>
                          <p className="font-mono text-xs">
                            {app.uri}
                          </p>
                        </div>

                        {/* Review Status Indicators */}
                        <div className="mt-3 flex gap-2">
                          {app.hasInternalComments && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                              Has Review
                            </span>
                          )}
                          {app.hasFeedback && (
                            <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded text-xs font-semibold">
                              Has Feedback
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="ml-4">
                        {getStatusBadge(app.status)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
