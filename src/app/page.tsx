'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'

export default function Home() {
  const [formData, setFormData] = useState({
    company_name: '',
    company_address: '',
    licence_number: '',
    membership_start_date: '',
    membership_end_date: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [successData, setSuccessData] = useState<{ signedUrl: string; companyName: string; licenceNumber: string } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)
    setSuccessData(null)

    try {
      const response = await fetch('/api/generate-licence-and-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate PDF')
      }

      // Store success data for display
      setSuccessData({
        signedUrl: data.signedUrl,
        companyName: formData.company_name,
        licenceNumber: formData.licence_number
      })

    } catch (error: any) {
      console.error('Error:', error)
      setErrorMessage(error.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDownloadGenerated = async () => {
    if (!successData) return

    setIsDownloading(true)

    try {
      // Fetch the PDF as a blob
      const pdfResponse = await fetch(successData.signedUrl)

      if (!pdfResponse.ok) {
        throw new Error('Failed to fetch PDF file')
      }

      const blob = await pdfResponse.blob()
      const blobUrl = URL.createObjectURL(blob)

      // Construct custom filename: {Company Name} {Licence Number}.pdf
      const sanitizedCompany = successData.companyName.replace(/[^a-zA-Z0-9\s-]/g, '').trim()
      const sanitizedLicence = successData.licenceNumber.replace(/[^a-zA-Z0-9-]/g, '').trim()
      const customFilename = `${sanitizedCompany} ${sanitizedLicence}.pdf`

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
      setIsDownloading(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Generate Licence"
        description="Create a new training provider licence certificate"
        action={
          <Link
            href="/licences"
            className="btn-secondary text-sm"
          >
            View All Licences
          </Link>
        }
      />

      <div className="max-w-3xl">
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Information Section */}
            <div className="pb-6 border-b-2 border-gray-200">
              <h3 className="text-lg font-bold text-navy mb-5 uppercase tracking-wide">Training Provider Information</h3>

              <div className="space-y-5">
                <div>
                  <label htmlFor="company_name" className="block text-sm font-semibold text-neutral-black mb-2">
                    Training Provider Name *
                  </label>
                  <input
                    type="text"
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    required
                    className="input-field"
                    placeholder="Enter training provider name"
                  />
                </div>

                <div>
                  <label htmlFor="company_address" className="block text-sm font-semibold text-neutral-black mb-2">
                    Training Provider Address *
                  </label>
                  <textarea
                    id="company_address"
                    name="company_address"
                    value={formData.company_address}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="input-field resize-none"
                    placeholder="Enter full address"
                  />
                </div>

                <div>
                  <label htmlFor="licence_number" className="block text-sm font-semibold text-neutral-black mb-2">
                    Licence Number *
                  </label>
                  <input
                    type="text"
                    id="licence_number"
                    name="licence_number"
                    value={formData.licence_number}
                    onChange={handleChange}
                    required
                    className="input-field"
                    placeholder="e.g., 001, 002"
                  />
                </div>
              </div>
            </div>

            {/* Membership Period Section */}
            <div>
              <h3 className="text-lg font-bold text-navy mb-5 uppercase tracking-wide">Membership Period</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="membership_start_date" className="block text-sm font-semibold text-neutral-black mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id="membership_start_date"
                    name="membership_start_date"
                    value={formData.membership_start_date}
                    onChange={handleChange}
                    required
                    className="input-field"
                  />
                </div>

                <div>
                  <label htmlFor="membership_end_date" className="block text-sm font-semibold text-neutral-black mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    id="membership_end_date"
                    name="membership_end_date"
                    value={formData.membership_end_date}
                    onChange={handleChange}
                    required
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t-2 border-gray-200">
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full md:w-auto px-8"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Licence...
                  </>
                ) : (
                  'Generate Licence'
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
                  Success!
                </h3>
                <p className="text-neutral-black mb-5 text-base">
                  Licence generated successfully for <strong>{successData.companyName}</strong>
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleDownloadGenerated}
                    disabled={isDownloading}
                    className="btn-primary disabled:bg-gray-400 disabled:cursor-not-allowed inline-flex items-center justify-center"
                  >
                    {isDownloading ? (
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
                        Download Licence
                      </>
                    )}
                  </button>
                  <Link
                    href="/licences"
                    className="btn-secondary text-center"
                  >
                    View All Licences
                  </Link>
                </div>
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
      </div>
    </>
  )
}
