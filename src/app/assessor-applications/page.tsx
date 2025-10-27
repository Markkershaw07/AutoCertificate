'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'

interface AnalysisResult {
  applicant: {
    uri: string
    name: string
  }
  application: {
    uri: string
    status: string
    submissionDate: string | null
    personalInfo: {
      fullName?: string
      email?: string
      phone?: string
      address?: string
      dateOfBirth?: string
    }
    qualifications: {
      firstAidCertificates?: string[]
      teachingQualifications?: string[]
      otherQualifications?: string[]
    }
    attachments: {
      required: Array<{ url: string; filename: string; fileSize?: number }>
      additional: Array<{ url: string; filename: string; fileSize?: number }>
    }
  }
  analysis: {
    summary: string
    requiredDocuments: Array<{ name: string; present: boolean; notes?: string }>
    additionalDocuments: Array<{ filename: string; notes?: string }>
    complianceIssues: string[]
    strengths: string[]
    recommendation: string
    recommendationReason: string
  }
  note: {
    content: string
    posted: boolean
  }
}

export default function AssessorApplicationAnalyzer() {
  const [formResponseUri, setFormResponseUri] = useState('/faib/form_response/')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  const handleAnalyze = async (e: FormEvent<HTMLFormElement>, postToSheepCRM = false) => {
    e.preventDefault()

    if (postToSheepCRM) {
      setIsPosting(true)
    } else {
      setIsAnalyzing(true)
    }

    setErrorMessage(null)

    try {
      const response = await fetch('/api/assessor-applications/analyze-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formResponseUri,
          postToSheepCRM
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to analyze application')
      }

      setAnalysisResult(data.data)
      setReviewNote(data.data.note.content)

    } catch (error: any) {
      console.error('Error:', error)
      setErrorMessage(error.message || 'An error occurred')
    } finally {
      setIsAnalyzing(false)
      setIsPosting(false)
    }
  }

  const handlePostNote = async () => {
    const fakeEvent = { preventDefault: () => {} } as FormEvent<HTMLFormElement>
    await handleAnalyze(fakeEvent, true)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  return (
    <>
      <PageHeader
        title="Trainer/Assessor Application Analyzer"
        description="Manually analyze trainer/assessor applications with AI"
        action={
          <Link href="/" className="btn-secondary text-sm">
            Generate Licence
          </Link>
        }
      />

      <div className="max-w-6xl">
        <div className="card">
          <form onSubmit={(e) => handleAnalyze(e, false)} className="space-y-6">
            <div>
              <label htmlFor="formResponseUri" className="block text-sm font-semibold text-neutral-black mb-2">
                Form Response URI *
              </label>
              <input
                type="text"
                id="formResponseUri"
                value={formResponseUri}
                onChange={(e) => setFormResponseUri(e.target.value)}
                required
                className="input-field font-mono text-sm"
                placeholder="/faib/form_response/68ff8f0f5f0364f42f8f5359/"
              />
              <p className="mt-2 text-sm text-gray-600">
                Enter the SheepCRM form response URI (e.g., /faib/form_response/68ff8f0f5f0364f42f8f5359/)
              </p>
            </div>

            <div className="pt-6 border-t-2 border-gray-200">
              <button
                type="submit"
                disabled={isAnalyzing}
                className="btn-primary w-full md:w-auto px-8"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing Application...
                  </>
                ) : (
                  'Analyze Application'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Analysis Results */}
        {analysisResult && (
          <div className="mt-6 space-y-6">
            {/* Applicant Info */}
            <div className="card">
              <h3 className="text-lg font-bold text-navy mb-4 uppercase tracking-wide">Applicant</h3>
              <p className="text-neutral-black">
                <strong>{analysisResult.applicant.name}</strong>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <strong>Submission Date:</strong> {formatDate(analysisResult.application.submissionDate)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <strong>Status:</strong> <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold uppercase">{analysisResult.application.status}</span>
              </p>
            </div>

            {/* Personal Information */}
            <div className="card">
              <h3 className="text-lg font-bold text-navy mb-4 uppercase tracking-wide">Personal Information</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-semibold text-gray-600">Full Name</dt>
                  <dd className="text-neutral-black mt-1">{analysisResult.application.personalInfo.fullName || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-gray-600">Email</dt>
                  <dd className="text-neutral-black mt-1">{analysisResult.application.personalInfo.email || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-gray-600">Phone</dt>
                  <dd className="text-neutral-black mt-1">{analysisResult.application.personalInfo.phone || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-gray-600">Date of Birth</dt>
                  <dd className="text-neutral-black mt-1">{analysisResult.application.personalInfo.dateOfBirth || 'N/A'}</dd>
                </div>
                {analysisResult.application.personalInfo.address && (
                  <div className="md:col-span-2">
                    <dt className="text-sm font-semibold text-gray-600">Address</dt>
                    <dd className="text-neutral-black mt-1">{analysisResult.application.personalInfo.address}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Documents */}
            <div className="card">
              <h3 className="text-lg font-bold text-navy mb-4 uppercase tracking-wide">
                Uploaded Documents
              </h3>

              {/* Required Documents */}
              {analysisResult.application.attachments.required.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-600 mb-3">Required Documents ({analysisResult.application.attachments.required.length})</h4>
                  <div className="space-y-2">
                    {analysisResult.application.attachments.required.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center space-x-3">
                          <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="text-sm font-semibold text-neutral-black">{doc.filename}</p>
                            {doc.fileSize && (
                              <p className="text-xs text-gray-500">{(doc.fileSize / 1024).toFixed(2)} KB</p>
                            )}
                          </div>
                        </div>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
                          View/Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Documents */}
              {analysisResult.application.attachments.additional.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-3">Additional Documents ({analysisResult.application.attachments.additional.length})</h4>
                  <div className="space-y-2">
                    {analysisResult.application.attachments.additional.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded">
                        <div className="flex items-center space-x-3">
                          <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="text-sm font-semibold text-neutral-black">{doc.filename}</p>
                            {doc.fileSize && (
                              <p className="text-xs text-gray-500">{(doc.fileSize / 1024).toFixed(2)} KB</p>
                            )}
                          </div>
                        </div>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
                          View/Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysisResult.application.attachments.required.length === 0 &&
               analysisResult.application.attachments.additional.length === 0 && (
                <p className="text-gray-600">No documents uploaded</p>
              )}
            </div>

            {/* AI Analysis */}
            <div className="card">
              <h3 className="text-lg font-bold text-navy mb-4 uppercase tracking-wide">AI Analysis</h3>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">Summary</h4>
                  <p className="text-neutral-black">{analysisResult.analysis.summary}</p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">Required Documents Check</h4>
                  <div className="space-y-2">
                    {analysisResult.analysis.requiredDocuments.map((doc, idx) => (
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

                {analysisResult.analysis.strengths.length > 0 && (
                  <div className="bg-green-50 p-4 rounded">
                    <h4 className="text-sm font-semibold text-green-800 mb-2">✅ Strengths</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {analysisResult.analysis.strengths.map((strength, idx) => (
                        <li key={idx} className="text-sm text-neutral-black">{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.analysis.complianceIssues.length > 0 && (
                  <div className="bg-red-50 p-4 rounded">
                    <h4 className="text-sm font-semibold text-red-800 mb-2">⚠️ Issues/Concerns</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {analysisResult.analysis.complianceIssues.map((issue, idx) => (
                        <li key={idx} className="text-sm text-neutral-black">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className={`p-4 rounded ${
                  analysisResult.analysis.recommendation === 'approve' ? 'bg-green-100' :
                  analysisResult.analysis.recommendation === 'reject' ? 'bg-red-100' :
                  'bg-yellow-100'
                }`}>
                  <h4 className="text-sm font-semibold mb-2">
                    {analysisResult.analysis.recommendation === 'approve' ? '✅ RECOMMEND: APPROVE' :
                     analysisResult.analysis.recommendation === 'reject' ? '❌ RECOMMEND: REJECT' :
                     '⚠️ RECOMMEND: REQUEST MORE INFO'}
                  </h4>
                  <p className="text-sm text-neutral-black">{analysisResult.analysis.recommendationReason}</p>
                </div>
              </div>
            </div>

            {/* Review Note Editor */}
            <div className="card">
              <h3 className="text-lg font-bold text-navy mb-4 uppercase tracking-wide">
                Review Note
                <span className="ml-2 text-sm font-normal text-gray-600">(AI Generated - Edit as needed)</span>
              </h3>

              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={20}
                className="input-field font-mono text-sm"
                placeholder="AI-generated review will appear here..."
              />

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handlePostNote}
                  disabled={isPosting || !reviewNote || analysisResult.note.posted}
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
                  ) : analysisResult.note.posted ? (
                    'Posted to SheepCRM ✓'
                  ) : (
                    'Post Review to SheepCRM'
                  )}
                </button>
              </div>
            </div>

            {/* Success - Note Posted */}
            {analysisResult.note.posted && (
              <div className="bg-white border-l-4 border-accent-green rounded-lg shadow-md p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-7 w-7 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-bold text-accent-green mb-2">
                      Review Posted Successfully!
                    </h3>
                    <p className="text-neutral-black mb-2">
                      The review has been posted to the application&apos;s internal comments in SheepCRM.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mt-6 bg-white border-l-4 border-accent-red rounded-lg shadow-md p-6">
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
