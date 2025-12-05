/**
 * Data Factory Service - Services Index
 *
 * Exports all service classes and creates a dependency-injected service container.
 */

export { AuditService } from './AuditService.js';
export { DatasetService } from './DatasetService.js';
export { SampleService } from './SampleService.js';
export { LabelingService } from './LabelingService.js';
export { WorkflowService, type CreateWorkflowRequest } from './WorkflowService.js';
export { GovernanceService } from './GovernanceService.js';
export { ExportService } from './ExportService.js';
export { AnnotatorService, type CreateAnnotatorRequest } from './AnnotatorService.js';
export { QualityService } from './QualityService.js';

import { AuditService } from './AuditService.js';
import { DatasetService } from './DatasetService.js';
import { SampleService } from './SampleService.js';
import { LabelingService } from './LabelingService.js';
import { WorkflowService } from './WorkflowService.js';
import { GovernanceService } from './GovernanceService.js';
import { ExportService } from './ExportService.js';
import { AnnotatorService } from './AnnotatorService.js';
import { QualityService } from './QualityService.js';

export interface ServiceContainer {
  audit: AuditService;
  dataset: DatasetService;
  sample: SampleService;
  labeling: LabelingService;
  workflow: WorkflowService;
  governance: GovernanceService;
  export: ExportService;
  annotator: AnnotatorService;
  quality: QualityService;
}

/**
 * Creates a service container with all services properly initialized
 * with their dependencies.
 */
export function createServiceContainer(): ServiceContainer {
  // Initialize services in dependency order
  const audit = new AuditService();
  const governance = new GovernanceService(audit);
  const sample = new SampleService(audit);
  const dataset = new DatasetService(audit);
  const labeling = new LabelingService(audit, sample);
  const workflow = new WorkflowService(audit, labeling, sample);
  const exportService = new ExportService(audit, governance, dataset);
  const annotator = new AnnotatorService(audit);
  const quality = new QualityService(audit, sample);

  return {
    audit,
    dataset,
    sample,
    labeling,
    workflow,
    governance,
    export: exportService,
    annotator,
    quality,
  };
}
