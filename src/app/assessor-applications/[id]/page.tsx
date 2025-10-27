'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import { AssessorApplicationData, AssessorAnalysisResult } from '@/types/assessor-application'

export default function AssessorApplicationDetail() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [application, setApplication] = useState<AssessorApplicationData | null>(null)
  const [analysis, setAnalysis] = useState<AssessorAnalysisResult | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'application' | 'attachments' | 'comments'>('application')

  useEffect(() => {
    fetchApplication()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchApplication = async () => {
    try {
      setIsLoading(true)
      setErrorMessage(null)

      const response = await fetch(`/api/assessor-applications/${id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to fetch application')
      }

      setApplication(data.application)
    } catch (error: any) {
      console.error('Error fetching application:', error)
      setErrorMessage(error.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnalyze = async () => {
    try {
      setIsAnalyzing(true)
      setErrorMessage(null)

      const response = await fetch(`/api/assessor-applications/${id}/analyze`, {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to analyze application')
      }

      setAnalysis(data.data.analysis)
      setReviewNote(data.data.reviewNote.content)
      setActiveTab('comments')
    } catch (error: any) {
      console.error('Error analyzing application:', error)
      setErrorMessage(error.message || 'An error occurred')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handlePostReview = async () => {
    try {
      setIsPosting(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/assessor-applications/${id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reviewContent: reviewNote
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to post review')
      }

      setSuccessMessage('Review posted successfully to SheepCRM!')

      // Refresh application data
      await fetchApplication()
    } catch (error: any) {
      console.error('Error posting review:', error)
      setErrorMessage(error.message || 'An error occurred')
    } finally {
      setIsPosting(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Loading Application..."
          description="Please wait"
        />
        <div className="card text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading application data...</p>
        </div>
      </>
    )
  }

  if (errorMessage && !application) {
    return (
      <>
        <PageHeader
          title="Error"
          description="Failed to load application"
        />
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
      </>
    )
  }

  if (!application) {
    return null
  }

  return (
    <>
      <PageHeader
        title={application.applicantName}
        description={`Trainer/Assessor Application - ${formatDate(application.submissionDate)}`}
        action={
          <Link href="/assessor-applications" className="btn-secondary text-sm">
            Back to List
          </Link>
        }
      />

      <div className="max-w-6xl">
        {/* Status and Actions */}
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div>
              <span className={`px-3 py-1 rounded text-sm font-semibold uppercase ${
                application.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                application.status === 'accepted' ? 'bg-green-100 text-green-800' :
                application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {application.status}
              </span>
            </div>

            <div>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="btn-primary"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing with AI...
                  </>
                ) : (
                  'Generate AI Review'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px space-x-8">
              <button
                onClick={() => setActiveTab('application')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'application'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Application
              </button>
              <button
                onClick={() => setActiveTab('attachments')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'attachments'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Attachments
                <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                  {application.attachments.required.length + application.attachments.additional.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'comments'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Comments & Review
              </button>
            </nav>
          </div>
        </div>

        {/* Application Tab */}
        {activeTab === 'application' && (
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="card">
              <h3 className="text-lg font-bold text-navy mb-4 uppercase tracking-wide">Personal Information</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-semibold text-gray-600">Full Name</dt>
                  <dd className="text-neutral-black mt-1">{application.personalInfo.fullName || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-gray-600">Email</dt>
                  <dd className="text-neutral-black mt-1">{application.personalInfo.email || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-gray-600">Phone</dt>
                  <dd className="text-neutral-black mt-1">{application.personalInfo.phone || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-gray-600">Date of Birth</dt>
                  <dd className="text-neutral-black mt-1">{application.personalInfo.dateOfBirth || 'N/A'}</dd>
                </div>
                {application.personalInfo.address && (
                  <div className="md:col-span-2">
                    <dt className="text-sm font-semibold text-gray-600">Address</dt>
                    <dd className="text-neutral-black mt-1">{application.personalInfo.address}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Qualifications */}
            <div className="card">
              <h3 className="text-lg font-bold text-navy mb-4 uppercase tracking-wide">Qualifications</h3>

              {application.qualifications.firstAidCertificates && application.qualifications.firstAidCertificates.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">First Aid Certificates</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {application.qualifications.firstAidCertificates.map((cert, idx) => (
                      <li key={idx} className="text-neutral-black">{cert}</li>
                    ))}
                  </ul>
                </div>
              )}

              {application.qualifications.teachingQualifications && application.qualifications.teachingQualifications.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">Teaching Qualifications</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {application.qualifications.teachingQualifications.map((qual, idx) => (
                      <li key={idx} className="text-neutral-black">{qual}</li>
                    ))}
                  </ul>
                </div>
              )}

              {application.qualifications.otherQualifications && application.qualifications.otherQualifications.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">Other Qualifications</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {application.qualifications.otherQualifications.map((qual, idx) => (
                      <li key={idx} className="text-neutral-black">{qual}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(!application.qualifications.firstAidCertificates || application.qualifications.firstAidCertificates.length === 0) &&
               (!application.qualifications.teachingQualifications || application.qualifications.teachingQualifications.length === 0) &&
               (!application.qualifications.otherQualifications || application.qualifications.otherQualifications.length === 0) && (
                <p className="text-gray-600">No qualifications listed in form fields</p>
              )}
            </div>
          </div>
        )}

        {/* Attachments Tab */}
        {activeTab === 'attachments' && (
          <div className="space-y-6">
            {/* Required Documents */}
            <div className="card">
              <h3 className="text-lg font-bold text-navy mb-4 uppercase tracking-wide">
                Required Documents
                <span className="ml-2 text-sm font-normal text-gray-600">
                  ({application.attachments.required.length})
                </span>
              </h3>

              {application.attachments.required.length > 0 ? (
                <div className="space-y-3">
                  {application.attachments.required.map((attachment, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center space-x-3">
                        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-neutral-black">{attachment.filename}</p>
                          {attachment.fileSize && (
                            <p className="text-xs text-gray-500">{(attachment.fileSize / 1024).toFixed(2)} KB</p>
                          )}
                        </div>
                      </div>
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-sm"
                      >
                        View/Download
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No required documents uploaded</p>
              )}
            </div>

            {/* Additional Documents */}
            <div className="card">
              <h3 className="text-lg font-bold text-navy mb-4 uppercase tracking-wide">
                Additional Documents
                <span className="ml-2 text-sm font-normal text-gray-600">
                  ({application.attachments.additional.length})
                </span>
              </h3>

              {application.attachments.additional.length > 0 ? (
                <div className="space-y-3">
                  {application.attachments.additional.map((attachment, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded">
                      <div className="flex items-center space-x-3">
                        <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <p className="text-sm font-semibold text-neutral-black">{attachment.filename}</p>
                          {attachment.fileSize && (
                            <p className="text-xs text-gray-500">{(attachment.fileSize / 1024).toFixed(2)} KB</p>
                          )}
                        </div>
                      </div>
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-sm"
                      >
                        View/Download
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No additional documents uploaded</p>
              )}
            </div>
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="space-y-6">
            {/* Existing Comments from SheepCRM */}
            {application.internalComments && (
              <div className="card bg-purple-50">
                <h3 className="text-lg font-bold text-navy mb-4 uppercase tracking-wide">
                  Existing Internal Comments
                </h3>
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-neutral-black font-mono bg-white p-4 rounded">
                    {application.internalComments}
                  </pre>
                </div>
              </div>
            )}

            {/* AI Analysis Results */}
            {analysis && (
              <div className="card">
                <h3 className="text-lg font-bold text-navy mb-4 uppercase tracking-wide">AI Analysis</h3>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-2">Summary</h4>
                    <p className="text-neutral-black">{analysis.summary}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-2">Required Documents Check</h4>
                    <div className="space-y-2">
                      {analysis.requiredDocuments.map((doc, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <span className="text-lg">{doc.present ? '✅' : '❌'}</span>
                          <div>
                            <p className="text-sm text-neutral-black font-medium">{doc.name}</p>
                            {doc.notes && <p className="text-xs text-gray-600">{doc.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {analysis.strengths.length > 0 && (
                    <div className="bg-green-50 p-4 rounded">
                      <h4 className="text-sm font-semibold text-green-800 mb-2">✅ Strengths</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {analysis.strengths.map((strength, idx) => (
                          <li key={idx} className="text-sm text-neutral-black">{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.complianceIssues.length > 0 && (
                    <div className="bg-red-50 p-4 rounded">
                      <h4 className="text-sm font-semibold text-red-800 mb-2">⚠️ Issues/Concerns</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {analysis.complianceIssues.map((issue, idx) => (
                          <li key={idx} className="text-sm text-neutral-black">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className={`p-4 rounded ${
                    analysis.recommendation === 'approve' ? 'bg-green-100' :
                    analysis.recommendation === 'reject' ? 'bg-red-100' :
                    'bg-yellow-100'
                  }`}>
                    <h4 className="text-sm font-semibold mb-2">
                      {analysis.recommendation === 'approve' ? '✅ RECOMMEND: APPROVE' :
                       analysis.recommendation === 'reject' ? '❌ RECOMMEND: REJECT' :
                       '⚠️ RECOMMEND: REQUEST MORE INFO'}
                    </h4>
                    <p className="text-sm text-neutral-black">{analysis.recommendationReason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Review Note Editor */}
            <div className="card">
              <h3 className="text-lg font-bold text-navy mb-4 uppercase tracking-wide">
                Review Note
                {analysis && <span className="ml-2 text-sm font-normal text-gray-600">(AI Generated - Edit as needed)</span>}
              </h3>

              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={15}
                className="input-field font-mono text-sm"
                placeholder="Generate AI review or write your own review here..."
              />

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handlePostReview}
                  disabled={isPosting || !reviewNote}
                  className="btn-primary"
                >
                  {isPosting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Posting to SheepCRM...
                    </>
                  ) : (
                    'Post Review to SheepCRM'
                  )}
                </button>
              </div>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="bg-white border-l-4 border-accent-green rounded-lg shadow-md p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-7 w-7 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-bold text-accent-green mb-2">Success!</h3>
                    <p className="text-neutral-black text-base">{successMessage}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {errorMessage && application && (
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
      </div>
    </>
  )
}
