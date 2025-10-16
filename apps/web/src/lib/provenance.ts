import { useCallback, useState } from 'react'

export type ProvenanceStepType =
  | 'ingest'
  | 'transform'
  | 'policy-check'
  | 'export'

export interface ProvenanceStep {
  id: string
  type: ProvenanceStepType
  tool: string
  params: Record<string, unknown>
  inputHash: string
  outputHash: string
  timestamp: string
  note?: string
}

export interface ProvenanceManifest {
  artifactId: string
  steps: ProvenanceStep[]
}

export interface StepMaterial {
  input: string
  output: string
}

export interface ArtifactEvidence {
  manifestUrl: string
  signatureUrl: string
}

export interface ArtifactRecord {
  id: string
  name: string
  createdAt: string
  manifest: ProvenanceManifest
  materials: Record<string, StepMaterial>
  evidence: ArtifactEvidence
}

export async function sha256Hex(
  payload: string | ArrayBuffer
): Promise<string> {
  const buffer =
    typeof payload === 'string' ? new TextEncoder().encode(payload) : payload
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function useHashVerifier() {
  const [verifying, setVerifying] = useState<string | null>(null)
  const [verifiedStep, setVerifiedStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const verify = useCallback(
    async (
      step: ProvenanceStep,
      materials: StepMaterial,
      direction: 'input' | 'output'
    ) => {
      setVerifying(`${step.id}-${direction}`)
      setError(null)
      setVerifiedStep(null)
      try {
        const expectedHash =
          direction === 'input' ? step.inputHash : step.outputHash
        const material =
          direction === 'input' ? materials.input : materials.output
        const hash = await sha256Hex(material)
        if (hash === expectedHash) {
          setVerifiedStep(step.id)
        } else {
          setError(
            `Hash mismatch. Expected ${expectedHash.substring(0, 12)}…, got ${hash.substring(0, 12)}…`
          )
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to verify hash')
      } finally {
        setVerifying(null)
      }
    },
    []
  )

  return { verifying, verifiedStep, error, verify }
}

export function formatStepType(type: ProvenanceStepType): string {
  switch (type) {
    case 'ingest':
      return 'Ingest'
    case 'transform':
      return 'Transform'
    case 'policy-check':
      return 'Policy Check'
    case 'export':
      return 'Export'
    default:
      return type
  }
}
