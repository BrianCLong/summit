/**
 * Labeling UI - Type Definitions
 */

export interface Dataset {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'draft' | 'active' | 'archived' | 'deprecated';
  taskType: TaskType;
  useCase: string;
  sampleCount: number;
  labeledSampleCount: number;
  createdAt: string;
  updatedAt: string;
}

export type TaskType =
  | 'entity_match'
  | 'entity_no_match'
  | 'cluster_review'
  | 'claim_assessment'
  | 'safety_decision'
  | 'relationship_validation'
  | 'text_classification'
  | 'named_entity_recognition'
  | 'sequence_labeling';

export interface Sample {
  id: string;
  datasetId: string;
  content: SampleContent;
  metadata: SampleMetadata;
  labels: LabelSet[];
  status: LabelStatus;
  isGolden: boolean;
  priority: number;
}

export interface SampleContent {
  text?: string;
  entities?: EntityPair[];
  relationships?: RelationshipData[];
  claims?: ClaimData[];
  raw?: Record<string, unknown>;
}

export interface EntityPair {
  entityA: EntityData;
  entityB: EntityData;
}

export interface EntityData {
  id: string;
  type: string;
  name: string;
  properties: Record<string, unknown>;
}

export interface RelationshipData {
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: string;
  confidence?: number;
  properties: Record<string, unknown>;
}

export interface ClaimData {
  id: string;
  claimText: string;
  source: string;
  confidence?: number;
  supportingEvidence?: string[];
}

export interface SampleMetadata {
  sourceId: string;
  sourceName: string;
  collectionDate: string;
  originalFormat: string;
  language?: string;
  domain?: string;
}

export type LabelStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'needs_review'
  | 'approved'
  | 'rejected';

export interface LabelSet {
  id: string;
  sampleId: string;
  annotatorId: string;
  labels: Label[];
  confidence?: number;
  notes?: string;
  timeSpent: number;
  status: LabelStatus;
  createdAt: string;
}

export interface Label {
  fieldName: string;
  value: unknown;
  confidence?: number;
  spans?: LabelSpan[];
}

export interface LabelSpan {
  start: number;
  end: number;
  label: string;
  confidence?: number;
}

export interface LabelingJob {
  id: string;
  datasetId: string;
  sampleId: string;
  taskType: TaskType;
  status: JobStatus;
  priority: number;
  instructions: string;
  assignedAt?: string;
  startedAt?: string;
  dueAt?: string;
}

export type JobStatus =
  | 'queued'
  | 'assigned'
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'escalated';

export interface Annotator {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: AnnotatorRole;
  taskTypes: TaskType[];
  performanceMetrics: AnnotatorMetrics;
  isActive: boolean;
}

export type AnnotatorRole = 'annotator' | 'reviewer' | 'admin' | 'quality_lead';

export interface AnnotatorMetrics {
  totalLabeled: number;
  accuracy: number;
  goldenQuestionAccuracy: number;
  averageTimePerTask: number;
  agreementRate: number;
  rejectionRate: number;
}

export interface QualityReport {
  datasetId: string;
  overallAgreement: number;
  goldenQuestionAccuracy: number;
  annotatorAccuracies: Array<{
    annotatorId: string;
    accuracy: number;
    count: number;
  }>;
  disagreementCount: number;
  labelDistribution: Record<string, number>;
}

export interface LabelingWorkflow {
  id: string;
  name: string;
  description: string;
  datasetId: string;
  taskType: TaskType;
  status: 'draft' | 'active' | 'paused' | 'completed';
  currentStageIndex: number;
  stages: WorkflowStage[];
}

export interface WorkflowStage {
  id: string;
  name: string;
  type: 'annotation' | 'review' | 'adjudication' | 'export';
  requiredRole: AnnotatorRole;
  minAnnotators: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
