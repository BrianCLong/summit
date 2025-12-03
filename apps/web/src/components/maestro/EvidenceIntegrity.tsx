// =============================================
// Evidence Integrity Checker Component
// =============================================
import React, { useEffect, useState } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
  LinkIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

interface EvidenceNode {
  nodeId: string
  sbom: {
    present: boolean
    url?: string | null
    digest?: string
  }
  cosign: {
    present: boolean
    verified?: boolean
    url?: string | null
    verifyCmd?: string
  }
  slsa: {
    present: boolean
    level?: string | null
    url?: string | null
  }
}

interface EvidenceSummary {
  nodes: number
  sbom: number
  cosign: number
  slsa: number
  pass: boolean
}

interface EvidenceData {
  runId: string
  summary: EvidenceSummary
  nodes: EvidenceNode[]
}

// Mock API function
const mockGetRunEvidenceCheck = async (
  runId: string
): Promise<EvidenceData> => {
  await new Promise(resolve => setTimeout(resolve, 500))

  const nodes = [
    'fetch_sources',
    'build_container',
    'scan_sbom',
    'sign_image',
    'deploy_artifact',
  ].map(nodeId => ({
    nodeId,
    sbom: {
      present: Math.random() > 0.1,
      url:
        Math.random() > 0.1
          ? `https://artifacts.example.com/${runId}/${nodeId}/sbom.json`
          : null,
      digest:
        Math.random() > 0.1
          ? `sha256:${Math.random().toString(16).slice(2, 66)}`
          : undefined,
    },
    cosign: {
      present: Math.random() > 0.15,
      verified: Math.random() > 0.05,
      url:
        Math.random() > 0.15
          ? `https://artifacts.example.com/${runId}/${nodeId}/cosign.sig`
          : null,
      verifyCmd:
        Math.random() > 0.15
          ? `cosign verify --key public.pem ghcr.io/example/${nodeId}@sha256:abc...`
          : undefined,
    },
    slsa: {
      present: Math.random() > 0.2,
      level: Math.random() > 0.2 ? 'L2' : null,
      url:
        Math.random() > 0.2
          ? `https://artifacts.example.com/${runId}/${nodeId}/slsa.intoto`
          : null,
    },
  }))

  const summary = {
    nodes: nodes.length,
    sbom: nodes.filter(n => n.sbom.present).length,
    cosign: nodes.filter(n => n.cosign.present && n.cosign.verified).length,
    slsa: nodes.filter(n => n.slsa.present).length,
    pass: nodes.every(
      n =>
        n.sbom.present &&
        n.cosign.present &&
        n.cosign.verified &&
        n.slsa.present
    ),
  }

  return { runId, summary, nodes }
}

interface EvidenceIntegrityProps {
  runId: string
}

export default function EvidenceIntegrity({ runId }: EvidenceIntegrityProps) {
  const [data, setData] = useState<EvidenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await mockGetRunEvidenceCheck(runId)
        setData(result)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load evidence data'
        )
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [runId])

  const handleExportCSV = () => {
    if (!data) {return}

    const csv = [
      'nodeId,sbom,cosignVerified,slsa',
      ...data.nodes.map(n =>
        [
          n.nodeId,
          n.sbom.present,
          n.cosign.present && n.cosign.verified,
          n.slsa.present,
        ].join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `evidence-${runId}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopyDigest = (digest: string) => {
    navigator.clipboard?.writeText(digest).then(() => {
      // Simple feedback - in production, would use notification system
      alert('Digest copied to clipboard!')
    })
  }

  const handleCopyVerifyCmd = (cmd: string) => {
    navigator.clipboard?.writeText(cmd).then(() => {
      alert('Verify command copied to clipboard!')
    })
  }

  if (loading) {
    return (
      <section
        className="rounded-2xl border border-gray-200 p-6"
        aria-label="Evidence integrity"
      >
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span className="text-gray-600">Loading evidence data...</span>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section
        className="rounded-2xl border border-red-200 bg-red-50 p-6"
        aria-label="Evidence integrity"
      >
        <div className="flex items-center space-x-2">
          <XCircleIcon className="h-5 w-5 text-red-600" />
          <span className="text-red-800">Failed to load evidence: {error}</span>
        </div>
      </section>
    )
  }

  if (!data) {return null}

  const overallStatus = data.summary.pass

  return (
    <section
      className="rounded-2xl border border-gray-200 p-6 space-y-4"
      aria-label="Evidence integrity"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-medium text-gray-900">
            Supply Chain Evidence
          </h3>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              overallStatus
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {overallStatus ? 'PASS' : 'FAIL'}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-600">
            Nodes {data.summary.nodes} • SBOM {data.summary.sbom} • Cosign{' '}
            {data.summary.cosign} • SLSA {data.summary.slsa}
          </div>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Nodes</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {data.summary.nodes}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <DocumentArrowDownIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">SBOM</span>
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-2">
            {data.summary.sbom}/{data.summary.nodes}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">Cosign</span>
          </div>
          <div className="text-2xl font-bold text-green-900 mt-2">
            {data.summary.cosign}/{data.summary.nodes}
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <LinkIcon className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">SLSA</span>
          </div>
          <div className="text-2xl font-bold text-purple-900 mt-2">
            {data.summary.slsa}/{data.summary.nodes}
          </div>
        </div>
      </div>

      {/* Detailed Node Table */}
      <div className="overflow-hidden bg-white border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Node
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SBOM
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cosign
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SLSA
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.nodes.map(node => (
              <tr key={node.nodeId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {node.nodeId}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {node.sbom.present ? (
                      <>
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        {node.sbom.url ? (
                          <a
                            href={node.sbom.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline text-sm"
                          >
                            View SBOM
                          </a>
                        ) : (
                          <span className="text-green-600 text-sm">
                            Present
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="h-4 w-4 text-red-500" />
                        <span className="text-red-600 text-sm">Missing</span>
                      </>
                    )}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {node.cosign.present ? (
                      node.cosign.verified ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                          {node.cosign.url ? (
                            <a
                              href={node.cosign.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-sm"
                            >
                              Verified
                            </a>
                          ) : (
                            <span className="text-green-600 text-sm">
                              Verified
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                          <span className="text-yellow-600 text-sm">
                            Unverified
                          </span>
                        </>
                      )
                    ) : (
                      <>
                        <XCircleIcon className="h-4 w-4 text-red-500" />
                        <span className="text-red-600 text-sm">Missing</span>
                      </>
                    )}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {node.slsa.present ? (
                      <>
                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        {node.slsa.url ? (
                          <a
                            href={node.slsa.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline text-sm"
                          >
                            {node.slsa.level || 'Present'}
                          </a>
                        ) : (
                          <span className="text-green-600 text-sm">
                            {node.slsa.level || 'Present'}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="h-4 w-4 text-red-500" />
                        <span className="text-red-600 text-sm">Missing</span>
                      </>
                    )}
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    {node.sbom.digest && (
                      <button
                        onClick={() => handleCopyDigest(node.sbom.digest!)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                        title="Copy SBOM digest"
                      >
                        Copy Digest
                      </button>
                    )}

                    {node.cosign.verifyCmd && (
                      <button
                        onClick={() =>
                          handleCopyVerifyCmd(node.cosign.verifyCmd!)
                        }
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                        title="Copy verification command"
                      >
                        Copy Verify
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Provenance Badge */}
      {data.nodes.some(n => n.cosign.verified) && (
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <ShieldCheckIcon className="h-4 w-4 mr-2" />
            Provenance Verified
          </div>
        </div>
      )}
    </section>
  )
}
