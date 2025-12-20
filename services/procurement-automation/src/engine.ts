import { v4 as uuidv4 } from 'uuid';
import {
  ProcurementFramework,
  ProcurementRequest,
  ATOPackage,
  ComplianceControl,
} from './types.js';
import { RequirementsParser, ParsedRequirements } from './requirements-parser.js';
import {
  FormAutoCompleteEngine,
  OrganizationProfile,
  SystemProfile,
  AutoFillDataSources,
  FormCompletionResult,
} from './form-autocomplete.js';
import {
  ATODocumentGenerator,
  GeneratedDocument,
  DocumentGenerationOptions,
} from './ato-document-generator.js';
import {
  ComplianceTracker,
  ComplianceDashboard,
  ComplianceMilestone,
} from './compliance-tracker.js';
import { SBOMIntegration, SBOMAnalysisResult } from './sbom-integration.js';

/**
 * Engine configuration
 */
export interface EngineConfig {
  organization: OrganizationProfile;
  system: SystemProfile;
}

/**
 * Quick start result
 */
export interface QuickStartResult {
  requestId: string;
  requirements: ParsedRequirements;
  checklist: ReturnType<ComplianceTracker['generateChecklist']>;
  timeline: ReturnType<ComplianceTracker['generateTimeline']>;
  forms: FormCompletionResult[];
}

/**
 * ProcurementAutomationEngine - Main orchestrator for procurement automation
 *
 * Provides a unified API for:
 * - Parsing procurement requirements
 * - Auto-completing compliance forms
 * - Generating ATO documents
 * - Tracking compliance progress
 * - Managing SBOM compliance
 */
export class ProcurementAutomationEngine {
  private parser: RequirementsParser;
  private formEngine: FormAutoCompleteEngine;
  private docGenerator: ATODocumentGenerator;
  private tracker: ComplianceTracker;
  private sbomIntegration: SBOMIntegration;

  private organization: OrganizationProfile;
  private system: SystemProfile;
  private controls: ComplianceControl[] = [];

  constructor(config: EngineConfig) {
    this.organization = config.organization;
    this.system = config.system;

    this.parser = new RequirementsParser();
    this.formEngine = new FormAutoCompleteEngine({
      organization: config.organization,
      system: config.system,
    });
    this.docGenerator = new ATODocumentGenerator(
      config.organization,
      config.system,
      this.controls,
    );
    this.tracker = new ComplianceTracker();
    this.sbomIntegration = new SBOMIntegration();
  }

  /**
   * Quick start - analyze requirements and set up tracking
   */
  quickStart(input: {
    title: string;
    description: string;
    frameworks: ProcurementFramework[];
    dataClassification?: 'public' | 'cui' | 'secret' | 'top_secret';
  }): QuickStartResult {
    // Parse requirements
    const requirements = this.parser.parseStructuredRequirements({
      frameworks: input.frameworks,
      dataClassification: input.dataClassification || 'cui',
    });

    // Generate initial controls
    this.controls = this.parser.generateInitialControls(requirements);

    // Create procurement request
    const request = this.tracker.createRequest({
      title: input.title,
      description: input.description,
      requestor: {
        name: this.organization.authorizedRepresentative.name,
        email: this.organization.authorizedRepresentative.email,
        organization: this.organization.name,
        role: this.organization.authorizedRepresentative.title,
      },
      frameworks: input.frameworks,
      dataClassification: input.dataClassification || 'cui',
      systemBoundary: this.system.systemBoundary,
    });

    // Generate checklist
    const checklist = this.tracker.generateChecklist(input.frameworks[0]);

    // Generate timeline
    const timeline = this.tracker.generateTimeline(request.id);

    // Auto-complete available forms
    const forms: FormCompletionResult[] = [];
    for (const template of this.formEngine.listTemplates()) {
      if (input.frameworks.includes(template.framework)) {
        forms.push(this.formEngine.autoCompleteForm(template.id));
      }
    }

    return {
      requestId: request.id,
      requirements,
      checklist,
      timeline,
      forms,
    };
  }

  /**
   * Parse requirements from text description
   */
  parseRequirements(text: string): ParsedRequirements {
    return this.parser.parseRequirementsText(text);
  }

  /**
   * Parse requirements from structured input
   */
  parseStructuredRequirements(input: {
    frameworks: ProcurementFramework[];
    dataClassification?: 'public' | 'cui' | 'secret' | 'top_secret';
  }): ParsedRequirements {
    return this.parser.parseStructuredRequirements(input);
  }

  /**
   * Auto-complete a specific form
   */
  autoCompleteForm(templateId: string): FormCompletionResult {
    return this.formEngine.autoCompleteForm(templateId);
  }

  /**
   * List available form templates
   */
  listFormTemplates() {
    return this.formEngine.listTemplates();
  }

  /**
   * Generate a specific ATO document
   */
  async generateDocument(
    docType: string,
    options?: Partial<DocumentGenerationOptions>,
  ): Promise<GeneratedDocument> {
    const defaultOptions: DocumentGenerationOptions = {
      format: 'markdown',
      includeEvidence: true,
      includeControlNarratives: true,
      signatureRequired: false,
      ...options,
    };

    return this.docGenerator.generateDocument(
      docType as any,
      defaultOptions,
    );
  }

  /**
   * Generate complete ATO package
   */
  async generateATOPackage(
    framework: ProcurementFramework,
    options?: Partial<DocumentGenerationOptions>,
  ): Promise<ATOPackage> {
    return this.docGenerator.generateATOPackage(framework, options);
  }

  /**
   * Get compliance dashboard for a request
   */
  getDashboard(requestId: string): ComplianceDashboard {
    return this.tracker.generateDashboard(requestId);
  }

  /**
   * Get milestones for a request
   */
  getMilestones(requestId: string): ComplianceMilestone[] {
    return this.tracker.getMilestones(requestId);
  }

  /**
   * Update milestone status
   */
  updateMilestone(
    requestId: string,
    milestoneId: string,
    update: Partial<ComplianceMilestone>,
  ): void {
    this.tracker.updateMilestone(requestId, milestoneId, update);
  }

  /**
   * Generate compliance checklist for a framework
   */
  generateChecklist(framework: ProcurementFramework) {
    return this.tracker.generateChecklist(framework);
  }

  /**
   * Generate project timeline
   */
  generateTimeline(requestId: string) {
    return this.tracker.generateTimeline(requestId);
  }

  /**
   * Export status report
   */
  exportStatusReport(requestId: string): string {
    return this.tracker.exportStatusReport(requestId);
  }

  /**
   * Analyze SBOM for compliance
   */
  analyzeSBOM(sbomData: unknown, format: 'cyclonedx' | 'spdx'): SBOMAnalysisResult {
    if (format === 'cyclonedx') {
      return this.sbomIntegration.parseCycloneDX(sbomData);
    }
    return this.sbomIntegration.parseSPDX(sbomData);
  }

  /**
   * Generate SBOM attestation
   */
  generateSBOMAttestation(analysis: SBOMAnalysisResult): string {
    return this.sbomIntegration.generateAttestation(analysis);
  }

  /**
   * Get all requests
   */
  listRequests(): ProcurementRequest[] {
    return this.tracker.listRequests();
  }

  /**
   * Get specific request
   */
  getRequest(id: string): ProcurementRequest | undefined {
    return this.tracker.getRequest(id);
  }

  /**
   * Update organization profile
   */
  updateOrganization(org: Partial<OrganizationProfile>): void {
    this.organization = { ...this.organization, ...org };
    this.formEngine.updateDataSources({ organization: this.organization });
  }

  /**
   * Update system profile
   */
  updateSystem(sys: Partial<SystemProfile>): void {
    this.system = { ...this.system, ...sys };
    this.formEngine.updateDataSources({ system: this.system });
  }

  /**
   * Get current controls
   */
  getControls(): ComplianceControl[] {
    return this.controls;
  }

  /**
   * Update control status
   */
  updateControl(
    controlId: string,
    update: Partial<ComplianceControl>,
  ): void {
    const index = this.controls.findIndex((c) => c.id === controlId);
    if (index >= 0) {
      this.controls[index] = { ...this.controls[index], ...update };
    }
  }
}
