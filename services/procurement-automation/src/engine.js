"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcurementAutomationEngine = void 0;
const requirements_parser_js_1 = require("./requirements-parser.js");
const form_autocomplete_js_1 = require("./form-autocomplete.js");
const ato_document_generator_js_1 = require("./ato-document-generator.js");
const compliance_tracker_js_1 = require("./compliance-tracker.js");
const sbom_integration_js_1 = require("./sbom-integration.js");
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
class ProcurementAutomationEngine {
    parser;
    formEngine;
    docGenerator;
    tracker;
    sbomIntegration;
    organization;
    system;
    controls = [];
    constructor(config) {
        this.organization = config.organization;
        this.system = config.system;
        this.parser = new requirements_parser_js_1.RequirementsParser();
        this.formEngine = new form_autocomplete_js_1.FormAutoCompleteEngine({
            organization: config.organization,
            system: config.system,
        });
        this.docGenerator = new ato_document_generator_js_1.ATODocumentGenerator(config.organization, config.system, this.controls);
        this.tracker = new compliance_tracker_js_1.ComplianceTracker();
        this.sbomIntegration = new sbom_integration_js_1.SBOMIntegration();
    }
    /**
     * Quick start - analyze requirements and set up tracking
     */
    quickStart(input) {
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
        const forms = [];
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
    parseRequirements(text) {
        return this.parser.parseRequirementsText(text);
    }
    /**
     * Parse requirements from structured input
     */
    parseStructuredRequirements(input) {
        return this.parser.parseStructuredRequirements(input);
    }
    /**
     * Auto-complete a specific form
     */
    autoCompleteForm(templateId) {
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
    async generateDocument(docType, options) {
        const defaultOptions = {
            format: 'markdown',
            includeEvidence: true,
            includeControlNarratives: true,
            signatureRequired: false,
            ...options,
        };
        return this.docGenerator.generateDocument(docType, defaultOptions);
    }
    /**
     * Generate complete ATO package
     */
    async generateATOPackage(framework, options) {
        return this.docGenerator.generateATOPackage(framework, options);
    }
    /**
     * Get compliance dashboard for a request
     */
    getDashboard(requestId) {
        return this.tracker.generateDashboard(requestId);
    }
    /**
     * Get milestones for a request
     */
    getMilestones(requestId) {
        return this.tracker.getMilestones(requestId);
    }
    /**
     * Update milestone status
     */
    updateMilestone(requestId, milestoneId, update) {
        this.tracker.updateMilestone(requestId, milestoneId, update);
    }
    /**
     * Generate compliance checklist for a framework
     */
    generateChecklist(framework) {
        return this.tracker.generateChecklist(framework);
    }
    /**
     * Generate project timeline
     */
    generateTimeline(requestId) {
        return this.tracker.generateTimeline(requestId);
    }
    /**
     * Export status report
     */
    exportStatusReport(requestId) {
        return this.tracker.exportStatusReport(requestId);
    }
    /**
     * Analyze SBOM for compliance
     */
    analyzeSBOM(sbomData, format) {
        if (format === 'cyclonedx') {
            return this.sbomIntegration.parseCycloneDX(sbomData);
        }
        return this.sbomIntegration.parseSPDX(sbomData);
    }
    /**
     * Generate SBOM attestation
     */
    generateSBOMAttestation(analysis) {
        return this.sbomIntegration.generateAttestation(analysis);
    }
    /**
     * Get all requests
     */
    listRequests() {
        return this.tracker.listRequests();
    }
    /**
     * Get specific request
     */
    getRequest(id) {
        return this.tracker.getRequest(id);
    }
    /**
     * Update organization profile
     */
    updateOrganization(org) {
        this.organization = { ...this.organization, ...org };
        this.formEngine.updateDataSources({ organization: this.organization });
    }
    /**
     * Update system profile
     */
    updateSystem(sys) {
        this.system = { ...this.system, ...sys };
        this.formEngine.updateDataSources({ system: this.system });
    }
    /**
     * Get current controls
     */
    getControls() {
        return this.controls;
    }
    /**
     * Update control status
     */
    updateControl(controlId, update) {
        const index = this.controls.findIndex((c) => c.id === controlId);
        if (index >= 0) {
            this.controls[index] = { ...this.controls[index], ...update };
        }
    }
}
exports.ProcurementAutomationEngine = ProcurementAutomationEngine;
