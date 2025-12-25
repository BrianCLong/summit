import { LabDefinition } from '../types.js';

export const analystILabs: LabDefinition[] = [
  {
    id: 'lab-1-ingest-map',
    title: 'Lab 1: Ingest & Map',
    description: 'Learn how to upload datasets, map schemas, and apply redaction presets.',
    version: '1.0.0',
    tags: ['Analyst I', 'Ingestion'],
    steps: [
      {
        id: 'upload_dataset',
        title: 'Upload Dataset',
        instructions: 'Upload a CSV dataset named "financial_records.csv" via the Ingestion interface.',
        validation: {
          type: 'provenance_event',
          config: {
            actionType: 'DATASET_UPLOAD',
            metadata: { filename: 'financial_records.csv' }
          }
        }
      },
      {
        id: 'map_schema',
        title: 'Map Schema',
        instructions: 'Map the "src_ip" column to the "IPAddress" entity type.',
        validation: {
          type: 'provenance_event',
          config: {
            actionType: 'SCHEMA_MAPPING_SAVED',
            payload: { mapping: { src_ip: 'IPAddress' } } // simplified match
          }
        }
      },
      {
        id: 'apply_redaction',
        title: 'Apply Redaction',
        instructions: 'Apply the "PII-Standard" redaction preset to the dataset.',
        validation: {
          type: 'provenance_event',
          config: {
            actionType: 'REDACTION_APPLIED',
            payload: { preset: 'PII-Standard' }
          }
        }
      }
    ]
  },
  {
    id: 'lab-2-resolve-reconcile',
    title: 'Lab 2: Resolve & Reconcile',
    description: 'Master entity resolution: merging, unmerging, and setting rules.',
    version: '1.0.0',
    tags: ['Analyst I', 'Entity Resolution'],
    steps: [
      {
        id: 'review_queue',
        title: 'Review ER Queue',
        instructions: 'Open the Entity Resolution queue and select the "John Doe" duplicate candidates.',
        validation: {
          type: 'manual', // Hard to detect "viewing", so manual check or just skip
          config: {}
        }
      },
      {
        id: 'merge_entities',
        title: 'Merge Entities',
        instructions: 'Merge the two "John Doe" entities.',
        validation: {
          type: 'provenance_event',
          config: {
            actionType: 'ER_MERGE'
          }
        }
      },
      {
        id: 'undo_merge',
        title: 'Undo Merge',
        instructions: 'Realize the mistake and undo the merge you just performed.',
        validation: {
          type: 'provenance_event',
          config: {
            actionType: 'ER_UNMERGE'
          }
        }
      },
      {
        id: 'set_never_merge',
        title: 'Set Never Merge Rule',
        instructions: 'Set a "Never Merge" rule between "John Doe (ID: 123)" and "John Doe (ID: 456)".',
        validation: {
          type: 'provenance_event',
          config: {
            actionType: 'ER_RULE_SET',
            payload: { ruleType: 'NEVER_MERGE' }
          }
        }
      }
    ]
  },
  {
    id: 'lab-3-hypothesis',
    title: 'Lab 3: Hypothesis & Cited Brief',
    description: 'Create hypotheses, attach evidence, and ensure all claims are cited.',
    version: '1.0.0',
    tags: ['Analyst I', 'Analysis'],
    steps: [
      {
        id: 'create_hypothesis',
        title: 'Create Hypothesis',
        instructions: 'Create a new hypothesis: "The traffic spike is due to a misconfiguration".',
        validation: {
          type: 'provenance_event',
          config: {
            actionType: 'HYPOTHESIS_CREATED'
          }
        }
      },
      {
        id: 'attach_evidence',
        title: 'Attach Evidence',
        instructions: 'Attach at least one piece of evidence to the hypothesis.',
        validation: {
          type: 'provenance_event',
          config: {
            actionType: 'EVIDENCE_ATTACHED'
          }
        }
      },
      {
        id: 'generate_brief',
        title: 'Generate Brief',
        instructions: 'Generate a brief. Ensure all claims are cited.',
        validation: {
          type: 'custom_check',
          config: {
            checkName: 'all_claims_cited'
          }
        }
      }
    ]
  }
];
