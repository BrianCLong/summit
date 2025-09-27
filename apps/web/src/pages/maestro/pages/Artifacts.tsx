// =============================================
// Maestro Artifacts Management
// =============================================
import React, { useMemo, useState } from 'react'
import {
  ArrowDownTrayIcon,
  CheckBadgeIcon,
  ExclamationCircleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

import { SAMPLE_ARTIFACTS } from '../../../data/sampleProvenance'
import {
  formatStepType,
  useHashVerifier,
} from '../../../lib/provenance'

export default function Artifacts() {
  const artifacts = useMemo(() => SAMPLE_ARTIFACTS, [])
  const [selectedArtifactId, setSelectedArtifactId] = useState(
    artifacts[0]?.id ?? '',
  )
  const [selectedStepId, setSelectedStepId] = useState(
    artifacts[0]?.manifest.steps[0]?.id ?? '',
  )
  const { verifying, verifiedStep, error, verify } = useHashVerifier()

  const selectedArtifact = artifacts.find(artifact => artifact.id === selectedArtifactId)
  const steps = selectedArtifact?.manifest.steps ?? []
  const activeStep =
    steps.find(step => step.id === selectedStepId) ?? steps[0] ?? null

  const materials = activeStep
    ? selectedArtifact?.materials[activeStep.id]
    : undefined

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Artifacts</h1>
          <p className="text-gray-600">
            Cryptographically verifiable evidence bundles emitted by Maestro
            runs.
          </p>
        </div>
        {selectedArtifact && (
          <div className="flex items-center space-x-3">
            <a
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              href={selectedArtifact.evidence.manifestUrl}
              download
            >
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
              Manifest
            </a>
            <a
              className="inline-flex items-center rounded-md border border-blue-500 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              href={selectedArtifact.evidence.signatureUrl}
              download
            >
              <ShieldCheckIcon className="mr-2 h-4 w-4" />
              Signature
            </a>
          </div>
        )}
      </header>

      <div className="grid grid-cols-12 gap-6">
        <aside className="col-span-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Artifacts
          </h2>
          <div className="space-y-2">
            {artifacts.map(artifact => {
              const isActive = artifact.id === selectedArtifactId
              return (
                <button
                  key={artifact.id}
                  type="button"
                  onClick={() => {
                    setSelectedArtifactId(artifact.id)
                    setSelectedStepId(artifact.manifest.steps[0]?.id ?? '')
                  }}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    isActive
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">
                      {artifact.name}
                    </span>
                    {verifiedStep && isActive ? (
                      <CheckBadgeIcon className="h-5 w-5 text-green-500" />
                    ) : null}
                  </div>
                  <dl className="mt-2 space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <dt>Artifact ID</dt>
                      <dd>{artifact.id}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Created</dt>
                      <dd>{new Date(artifact.createdAt).toLocaleString()}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Steps</dt>
                      <dd>{artifact.manifest.steps.length}</dd>
                    </div>
                  </dl>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="col-span-8 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Provenance Chain
              </h2>
              <p className="text-sm text-gray-600">
                Each step includes canonical input/output hashes for reproducible
                verification.
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {steps.map(step => {
                const isActive = step.id === activeStep?.id
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setSelectedStepId(step.id)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left transition ${
                      isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatStepType(step.type)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {step.tool} • {new Date(step.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p className="font-mono">{step.outputHash.slice(0, 12)}…</p>
                      <p>Hash</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {activeStep && materials ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {formatStepType(activeStep.type)} Step
                  </h3>
                  <p className="text-sm text-gray-600">
                    {activeStep.note ?? 'No description provided'}
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {activeStep.tool}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Input (expected hash {activeStep.inputHash.slice(0, 12)}…)
                  </h4>
                  <pre className="mt-2 h-32 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-green-200">
                    {materials.input}
                  </pre>
                  <button
                    type="button"
                    onClick={() => verify(activeStep, materials, 'input')}
                    className="mt-3 inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    disabled={verifying !== null}
                  >
                    {verifying === `${activeStep.id}-input` ? 'Verifying…' : 'Verify input hash'}
                  </button>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Output (expected hash {activeStep.outputHash.slice(0, 12)}…)
                  </h4>
                  <pre className="mt-2 h-32 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-blue-200">
                    {materials.output}
                  </pre>
                  <button
                    type="button"
                    onClick={() => verify(activeStep, materials, 'output')}
                    className="mt-3 inline-flex items-center rounded-md border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                    disabled={verifying !== null}
                  >
                    {verifying === `${activeStep.id}-output` ? 'Verifying…' : 'Verify output hash'}
                  </button>
                </div>
              </div>

              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">
                    Step Parameters
                  </dt>
                  <dd className="mt-1 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                    <code className="font-mono text-xs">
                      {JSON.stringify(activeStep.params, null, 2)}
                    </code>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">
                    Timestamp
                  </dt>
                  <dd className="mt-1 text-sm text-gray-700">
                    {new Date(activeStep.timestamp).toLocaleString()}
                  </dd>
                </div>
              </dl>

              {error ? (
                <div className="flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  <ExclamationCircleIcon className="mr-2 h-4 w-4" />
                  {error}
                </div>
              ) : null}

              {verifiedStep === activeStep.id && !error ? (
                <div className="flex items-center rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  <CheckBadgeIcon className="mr-2 h-4 w-4" />
                  Hash matches expected digest.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
              Select a step to view provenance details.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
