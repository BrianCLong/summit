import type {
  ArtifactRecord,
  ProvenanceManifest,
  ProvenanceStep,
} from '../lib/provenance'

const rawCsv = 'id,name,score\n1,Ada,82\n2,Bryn,91\n'
const normalisedCsv = rawCsv
const normalisedJson =
  '[{"id":1,"name":"Ada","score":82},{"id":2,"name":"Bryn","score":91}]'
const policyPayload = '{"maxRows": 100000, "rowCount": 2, "status": "pass"}'

const ingestStep: ProvenanceStep = {
  id: 'run-101:ingest',
  type: 'ingest',
  tool: 'connector.csv',
  params: { path: '/data/leads.csv' },
  inputHash: '9044d26420b889f8daae10acd9d5ac6582af8d365f1f30d59b8462f335bce558',
  outputHash: '9044d26420b889f8daae10acd9d5ac6582af8d365f1f30d59b8462f335bce558',
  timestamp: '2024-02-01T12:05:12.000Z',
  note: 'Loaded CSV source and normalised column order',
}

const transformStep: ProvenanceStep = {
  id: 'run-101:transform',
  type: 'transform',
  tool: 'connector.normalise',
  params: { columns: ['id', 'name', 'score'] },
  inputHash: ingestStep.outputHash,
  outputHash: '60e9f26e6c64ae695f257f4943ea80ebad3c0b0960125f88efa037377f876805',
  timestamp: '2024-02-01T12:05:15.000Z',
  note: 'Converted records to canonical JSON ordering',
}

const policyStep: ProvenanceStep = {
  id: 'run-101:policy',
  type: 'policy-check',
  tool: 'policy.row-threshold',
  params: { rule: 'row_threshold' },
  inputHash: transformStep.outputHash,
  outputHash: 'abb30981befa9420ba4266ccaaee46f094a16781a93d9823f9b97b7940f3dc60',
  timestamp: '2024-02-01T12:05:18.000Z',
  note: 'Validated dataset against policy thresholds',
}

const exportStep: ProvenanceStep = {
  id: 'run-101:export',
  type: 'export',
  tool: 'connector.export',
  params: { rows: 2, columns: ['id', 'name', 'score'] },
  inputHash: policyStep.outputHash,
  outputHash: policyStep.outputHash,
  timestamp: '2024-02-01T12:05:20.000Z',
  note: 'Prepared evidence bundle for downstream consumption',
}

const manifest: ProvenanceManifest = {
  artifactId: 'run-101',
  steps: [ingestStep, transformStep, policyStep, exportStep],
}

export const SAMPLE_ARTIFACTS: ArtifactRecord[] = [
  {
    id: 'run-101',
    name: 'Leads CSV Import',
    createdAt: '2024-02-01T12:05:20.000Z',
    manifest,
    materials: {
      'run-101:ingest': { input: rawCsv, output: normalisedCsv },
      'run-101:transform': { input: normalisedCsv, output: normalisedJson },
      'run-101:policy': { input: normalisedJson, output: policyPayload },
      'run-101:export': { input: policyPayload, output: policyPayload },
    },
    evidence: {
      manifestUrl: '/exports/run-101/manifest.json',
      signatureUrl: '/exports/run-101/manifest.sig',
    },
  },
]
