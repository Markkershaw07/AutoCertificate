'use client'

import { useState, FormEvent } from 'react'
import PageHeader from '@/components/layout/PageHeader'

export default function SheepCRMSyncPage() {
  const [personUri, setPersonUri] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [successData, setSuccessData] = useState<{ companyName: string; licenceNumber: string; signedUrl?: string } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)
    setSuccessData(null)

    try {
      const response = await fetch('/api/sheepcrm/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ person_uri: personUri }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to sync from SheepCRM')
      }

      // Store success data
      setSuccessData({
        companyName: data.data.company_name,
        licenceNumber: data.data.licence_number,
        signedUrl: data.data.signed_url
      })

      // Clear form
      setPersonUri('')

    } catch (error: any) {
      console.error('Error:', error)
      setErrorMessage(error.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!successData?.signedUrl) return

    try {
      const pdfResponse = await fetch(successData.signedUrl)
      if (!pdfResponse.ok) throw new Error('Failed to fetch PDF')

      const blob = await pdfResponse.blob()
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${successData.companyName} ${successData.licenceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (err: any) {
      alert(err.message || 'Failed to download file')
    }
  }

  return (
    <>
      <PageHeader
        title="SheepCRM Sync"
        description="Manually trigger certificate generation from SheepCRM member data"
      />

      <div className="max-w-3xl">
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-700">
                  <p className="font-semibold mb-1">How to find the Member URI:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Go to SheepCRM and open the Training Provider&apos;s membership record</li>
                    <li>Look for the <strong>Member URI</strong> (NOT the person/organisation URI)</li>
                    <li>Format: <code className="bg-blue-100 px-1 rounded">/bucket/member/uid/</code></li>
                  </ol>
                  <p className="mt-2 font-semibold">Example (Busy Bees):</p>
                  <p><code className="bg-blue-100 px-1 rounded">/faib/member/68d29043da49280ce946436d/</code></p>
                  <p className="mt-2 text-xs">Note: Only "First Aid Training Provider" memberships will generate certificates.</p>
                </div>
              </div>
            </div>

            {/* Member URI Input */}
            <div>
              <label htmlFor="person_uri" className="block text-sm font-semibold text-neutral-black mb-2">
                SheepCRM Member URI *
              </label>
              <input
                type="text"
                id="person_uri"
                value={personUri}
                onChange={(e) => setPersonUri(e.target.value)}
                required
                className="input-field font-mono text-sm"
                placeholder="/faib/member/68d29043da49280ce946436d/"
              />
              <p className="mt-1 text-xs text-gray-500">
                Paste the member URI from the Training Provider&apos;s membership record
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t-2 border-gray-200">
              <button
                type="submit"
                disabled={isLoading || !personUri.trim()}
                className="btn-primary w-full md:w-auto px-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing from SheepCRM...
                  </>
                ) : (
                  'Generate Certificate from SheepCRM'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Success Message */}
        {successData && (
          <div className="mt-6 bg-white border-l-4 border-accent-green rounded-lg shadow-md p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-7 w-7 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-bold text-accent-green mb-2">
                  Certificate Generated!
                </h3>
                <p className="text-neutral-black mb-1">
                  <strong>Training Provider:</strong> {successData.companyName}
                </p>
                <p className="text-neutral-black mb-5">
                  <strong>Licence Number:</strong> {successData.licenceNumber}
                </p>
                {successData.signedUrl && (
                  <button
                    onClick={handleDownload}
                    className="btn-primary inline-flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Certificate
                  </button>
                )}
              </div>
            </div>
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

        {/* Info Section */}
        <div className="mt-6 card bg-gray-50">
          <h3 className="text-lg font-bold text-navy mb-3">About Automatic Sync</h3>
          <p className="text-neutral-black mb-4">
            This page is for manual testing and troubleshooting. In production, certificates will be automatically generated when:
          </p>
          <ul className="list-disc list-inside space-y-2 text-neutral-black">
            <li>A training provider makes a payment in SheepCRM</li>
            <li>SheepCRM sends a webhook to your application</li>
            <li>The certificate is auto-generated and stored</li>
          </ul>
          <p className="text-neutral-black mt-4 text-sm">
            <strong>Webhook URL:</strong> <code className="bg-gray-200 px-2 py-1 rounded text-xs">{typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/sheepcrm</code>
          </p>
        </div>
      </div>
    </>
  )
}
