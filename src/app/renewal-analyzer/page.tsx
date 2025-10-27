'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'

interface AnalysisResult {
  organization: {
    uri: string
    name: string
  }
  certificates: {
    breakdown: any
    total: number
  }
  trainers: {
    count: number
    names: string[]
  }
  pricing: {
    bracket: string
    membershipFee: {
      exVAT: number
      vat: number
      incVAT: number
    }
    trainerFee: {
      exVAT: number
      vat: number
      incVAT: number
    }
    total: {
      exVAT: number
      vat: number
      incVAT: number
    }
  }
  analysis: {
    summary: string
    missingItems: string[]
    complianceIssues: string[]
    trainerDetails: string
  }
  note: {
    content: string
    posted: boolean
    journalEntryUri: string | null
  }
}

export default function RenewalAnalyzer() {
  const [formResponseUri, setFormResponseUri] = useState('/faib/form_response/')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleAnalyze = async (e: FormEvent<HTMLFormElement>, postToSheepCRM = false) => {
    e.preventDefault()

    if (postToSheepCRM) {
      setIsPosting(true)
    } else {
      setIsAnalyzing(true)
    }

    setErrorMessage(null)

    try {
      const response = await fetch('/api/analyze-renewal', {
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
        throw new Error(data.error || data.details || 'Failed to analyze form')
      }

      setAnalysisResult(data.data)

    } catch (error: any) {
      console.error('Error:', error)
      setErrorMessage(error.message || 'An error occurred')
    } finally {
      setIsAnalyzing(false)
      setIsPosting(false)
    }
  }

  const handlePostNote = async () => {
    // Create a fake form event to reuse the handler
    const fakeEvent = { preventDefault: () => {} } as FormEvent<HTMLFormElement>
    await handleAnalyze(fakeEvent, true)
  }

  return (
    <>
      <PageHeader
        title="Renewal Form Analyzer"
        description="Manually analyze renewal form submissions with AI"
        action={
          <Link
            href="/"
            className="btn-secondary text-sm"
          >
            Generate Licence
          </Link>
        }
      />

      <div className="max-w-5xl">
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
                placeholder="/faib/form_response/68f5eae8c910acdd3232409d/"
              />
              <p className="mt-2 text-sm text-gray-600">
                Enter the SheepCRM form response URI (e.g., /faib/form_response/68f5eae8c910acdd3232409d/)
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
                    Analyzing Form...
                  </>
                ) : (
                  'Analyze Form'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Analysis Results */}
        {analysisResult && (
          <div className="mt-6 space-y-6">
            {/* Organization Info */}
            <div className="card">
              <h3 className="text-lg font-bold text-navy mb-4 uppercase tracking-wide">Organization</h3>
              <p className="text-neutral-black">
                <strong>{analysisResult.organization.name}</strong>
              </p>
              <p className="text-sm text-gray-600 font-mono">{analysisResult.organization.uri}</p>
            </div>

            {/* Key Metrics */}
            <div className="card">
              <h3 className="text-lg font-bold text-navy mb-4 uppercase tracking-wide">Key Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">Certificates Issued</p>
                  <p className="text-2xl font-bold text-accent-blue">{analysisResult.certificates.total.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">Trainers Renewing</p>
                  <p className="text-2xl font-bold text-accent-blue">{analysisResult.trainers.count}</p>
                </div>
              </div>

              {analysisResult.trainers.names.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-600 mb-2">Trainer Names:</p>
                  <ul className="list-disc list-inside text-neutral-black space-y-1">
                    {analysisResult.trainers.names.map((name, idx) => (
                      <li key={idx}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Pricing Breakdown */}
            <div className="card">
              <h3 className="text-lg font-bold text-navy mb-4 uppercase tracking-wide">Pricing Breakdown</h3>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-600">Bracket: {analysisResult.pricing.bracket}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Membership Fee</p>
                  <p className="text-neutral-black">
                    £{analysisResult.pricing.membershipFee.exVAT.toFixed(2)} + VAT (£{analysisResult.pricing.membershipFee.vat.toFixed(2)}) =
                    <span className="font-bold"> £{analysisResult.pricing.membershipFee.incVAT.toFixed(2)}</span>
                  </p>
                </div>

                {analysisResult.trainers.count > 0 && (
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Trainer Fees ({analysisResult.trainers.count} trainer{analysisResult.trainers.count > 1 ? 's' : ''} × £20)
                    </p>
                    <p className="text-neutral-black">
                      £{analysisResult.pricing.trainerFee.exVAT.toFixed(2)} + VAT (£{analysisResult.pricing.trainerFee.vat.toFixed(2)}) =
                      <span className="font-bold"> £{analysisResult.pricing.trainerFee.incVAT.toFixed(2)}</span>
                    </p>
                  </div>
                )}

                <div className="bg-accent-blue text-white p-4 rounded">
                  <p className="text-sm font-semibold mb-2">TOTAL RENEWAL COST</p>
                  <p className="text-3xl font-bold">£{analysisResult.pricing.total.incVAT.toFixed(2)}</p>
                  <p className="text-sm opacity-90 mt-1">
                    (£{analysisResult.pricing.total.exVAT.toFixed(2)} + £{analysisResult.pricing.total.vat.toFixed(2)} VAT)
                  </p>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="card">
              <h3 className="text-lg font-bold text-navy mb-4 uppercase tracking-wide">AI Analysis</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">Summary</p>
                  <p className="text-neutral-black">{analysisResult.analysis.summary}</p>
                </div>

                {analysisResult.analysis.missingItems.length > 0 && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <p className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Missing/Unchecked Items</p>
                    <ul className="list-disc list-inside text-neutral-black space-y-1">
                      {analysisResult.analysis.missingItems.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.analysis.complianceIssues.length > 0 && (
                  <div className="bg-red-50 border-l-4 border-accent-red p-4">
                    <p className="text-sm font-semibold text-red-800 mb-2">⚠️ Compliance Issues</p>
                    <ul className="list-disc list-inside text-neutral-black space-y-1">
                      {analysisResult.analysis.complianceIssues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.analysis.trainerDetails && (
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-2">Trainer Details</p>
                    <p className="text-neutral-black">{analysisResult.analysis.trainerDetails}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Post to SheepCRM */}
            {!analysisResult.note.posted && (
              <div className="card bg-blue-50">
                <h3 className="text-lg font-bold text-navy mb-3">Ready to Post</h3>
                <p className="text-neutral-black mb-4">
                  The analysis is complete. Click below to post this summary as a journal note to the organization&apos;s profile in SheepCRM.
                </p>
                <button
                  onClick={handlePostNote}
                  disabled={isPosting}
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
                    'Post Note to SheepCRM'
                  )}
                </button>
              </div>
            )}

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
                      Note Posted Successfully!
                    </h3>
                    <p className="text-neutral-black mb-2">
                      The analysis has been posted to <strong>{analysisResult.organization.name}</strong>&apos;s journal in SheepCRM.
                    </p>
                    {analysisResult.note.journalEntryUri && (
                      <p className="text-sm text-gray-600 font-mono">{analysisResult.note.journalEntryUri}</p>
                    )}
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
