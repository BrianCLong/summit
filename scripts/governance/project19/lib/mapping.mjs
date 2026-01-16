/**
 * Mapping Operations Library
 * Handles the translation of GitHub events, labels, milestones to Project field values
 */

import fs from 'fs';
import path from 'path';
import { sortObjectKeys, stableId, deepEquals } from './determinism.mjs';

class MappingOperations {
  constructor(labelMapPath, workflowMapPath) {
    // Load configurations - with defaults if files don't exist
    this.labelMap = this.loadConfig(labelMapPath, {
      delivery_class: {
        "security": "Security",
        "compliance": "Compliance", 
        "release": "Release",
        "infra": "Infra",
        "tech-debt": "Tech Debt",
        "research": "Research",
        "feature": "Feature",
        "bug": "Bug Fix",
        "enhancement": "Feature"
      },
      governance_gate: {
        "gate:design": "Design",
        "gate:security": "Security",
        "gate:compliance": "Compliance", 
        "gate:release": "Release",
        "gate:ga": "GA",
        "security-review": "Security",
        "compliance-review": "Compliance",
        "release-review": "Release"
      },
      evidence_required: {
        "gate:ga": "Yes",
        "gate:compliance": "Yes",
        "gate:security": "Yes",
        "evidence:required": "Yes",
        "evidence:none": "No",
        "audit-required": "Yes"
      },
      control_mapping: {
        "ctrl:soc2": ["SOC2"],
        "ctrl:iso27001": ["ISO27001"],
        "ctrl:nist800-53": ["NIST800-53"],
        "ctrl:slsa": ["SLSA"],
        "ctrl:sbom": ["SBOM"],
        "compliance:soc2": ["SOC2"],
        "compliance:iso": ["ISO27001"],
        "compliance:nist": ["NIST800-53"]
      },
      automation_eligibility: {
        "auto:manual": "Manual Only",
        "auto:assist": "Agent Assist",
        "auto:execute": "Agent Execute", 
        "auto:autonomous": "Fully Autonomous",
        "agent:assist": "Agent Assist",
        "agent:execute": "Agent Execute"
      },
      work_type: {
        "work:human": "Human",
        "work:agent": "Agent",
        "work:hybrid": "Hybrid"
      },
      agent: {
        "agent:jules": "Jules",
        "agent:codex": "Codex",
        "agent:claude": "Claude",
        "agent:qwen": "Qwen",
        "agent:atlas": "Atlas", 
        "agent:antigravity": "Antigravity"
      },
      milestone_release_train: [
        { "pattern": "GA", "value": "GA" },
        { "pattern": "MVP-4", "value": "MVP-4" },
        { "pattern": "Post-GA", "value": "Post-GA" },
        { "pattern": "Weekly", "value": "Weekly" },
        { "pattern": "Nightly", "value": "Nightly" }
      ],
      release_blocker: {
        "blocker:release": "Yes",
        "priority:p0": "Yes"
      },
      audit_criticality: {
        "audit:control": "Control",
        "audit:material": "Material",
        "audit:info": "Informational", 
        "criticality:control": "Control",
        "criticality:material": "Material"
      },
      strategic_theme: {
        "theme:ga": "GA Readiness",
        "theme:trust": "Trust",
        "theme:scale": "Scale",
        "theme:cost": "Cost", 
        "theme:velocity": "Velocity",
        "theme:moat": "Moat",
        "strategic:ga": "GA Readiness"
      },
      customer_impact: {
        "impact:customer": "GA",
        "impact:pilot": "Pilot",
        "impact:internal": "Internal",
        "customer-facing": "GA"
      },
      reputation_risk: {
        "risk:existential": "Existential",
        "risk:high": "High", 
        "risk:medium": "Medium",
        "risk:low": "Low"
      },
      determinism_risk: {
        "det:confirmed": "Confirmed",
        "det:potential": "Potential",
        "det:none": "None"
      },
      ci_status: {
        "ci:green": "Green",
        "ci:flaky": "Flaky",
        "ci:failing": "Failing", 
        "status:passing": "Green",
        "status:failing": "Failing"
      }
    });

    this.workflowMap = this.loadConfig(workflowMapPath, {
      version: "2026-01-15",
      workflows: [
        {
          "name_match": "CI Core",
          "sets": ["CI Status Snapshot", "Artifact Produced"],
          "required_artifacts": ["stamp.json"],
          "optional_artifacts": ["coverage-summary.json", "report.json"]
        },
        {
          "name_match": "Evidence ID Consistency",
          "sets": ["CI Status Snapshot", "Artifact Produced", "Determinism Risk", "Evidence Complete", "Evidence Bundle ID"],
          "required_artifacts": ["stamp.json"],
          "optional_artifacts": ["report.json"]
        },
        {
          "name_match": "Governance / Docs Integrity",
          "sets": ["CI Status Snapshot", "Artifact Produced", "Evidence Complete"],
          "required_artifacts": ["stamp.json"],
          "optional_artifacts": ["docs-report.json"]
        },
        {
          "name_match": "GA Verify",
          "sets": ["CI Status Snapshot", "Artifact Produced", "Determinism Risk", "Evidence Complete", "Evidence Bundle ID", "Policy Version"],
          "required_artifacts": ["stamp.json"],
          "optional_artifacts": ["report.json"]
        },
        {
          "name_match": "Security Scan",
          "sets": ["CI Status Snapshot", "Audit Criticality", "External Audit Scope", "Control Mapping"],
          "required_artifacts": ["security-results.json"],
          "optional_artifacts": ["vulnerability-report.json"]
        },
        {
          "name_match": "Compliance Check",
          "sets": ["CI Status Snapshot", "Evidence Required", "External Audit Scope", "Control Mapping"],
          "required_artifacts": ["compliance-results.json"],
          "optional_artifacts": ["framework-coverage.json"]
        },
        {
          "name_match": "Coverage Analysis",
          "sets": ["Test Coverage Delta"],
          "required_artifacts": ["coverage-summary.json"],
          "optional_artifacts": ["coverage-details.json"]
        },
        {
          "name_match": "Determinism Check",
          "sets": ["Determinism Risk", "CI Status Snapshot"],
          "required_artifacts": ["determinism-report.json"],
          "optional_artifacts": ["analysis-details.json"]
        }
      ],
      artifact_processing: {
        "stamp.json": {
          "field_mapping": {
            "status": "CI Status Snapshot",
            "determinism_risk": "Determinism Risk",
            "policy_version": "Policy Version",
            "evidence_bundle_id": "Evidence Bundle ID",
            "evidence_complete": "Evidence Complete"
          }
        },
        "report.json": {
          "field_mapping": {
            "determinism_risk": "Determinism Risk",
            "gate_status": "Gate Status",
            "evidence_complete": "Evidence Complete",
            "readiness_score": "GA Readiness Score",
            "violations": "Blocked Count"
          }
        },
        "coverage-summary.json": {
          "field_mapping": {
            "delta_percent": "Test Coverage Delta",
            "current_percent": "Current Coverage",
            "baseline_percent": "Baseline Coverage"
          }
        },
        "security-results.json": {
          "field_mapping": {
            "audit_criticality": "Audit Criticality",
            "external_audit_scope": "External Audit Scope",
            "critical_count": "Critical Vulnerabilities",
            "high_count": "High Vulnerabilities"
          }
        },
        "compliance-results.json": {
          "field_mapping": {
            "evidence_required": "Evidence Required",
            "external_audit_scope": "External Audit Scope",
            "frameworks": "Control Mapping",
            "outstanding_items": "Outstanding Compliance Items"
          }
        }
      }
    });
  }

  /**
   * Load configuration from file with fallback to defaults
   */
  loadConfig(path, defaultValue) {
    if (!path || !fs.existsSync(path)) {
      // Use default if file doesn't exist or path isn't provided
      return defaultValue;
    }

    try {
      const content = fs.readFileSync(path, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error loading config from ${path}:`, error.message);
      console.warn('Using default configuration');
      return defaultValue;
    }
  }

  /**
   * Map GitHub event labels to project field values
   */
  mapLabelsToFields(labels) {
    if (!labels) labels = [];
    
    const fieldUpdates = {};
    const labelsLower = labels.map(l => typeof l === 'string' ? l.toLowerCase() : l.name?.toLowerCase() || l.label?.name?.toLowerCase() || '');

    // Map delivery class based on labels
    for (const [label, value] of Object.entries(this.labelMap.delivery_class || {})) {
      if (labelsLower.includes(label)) {
        fieldUpdates['Delivery Class'] = value;
      }
    }

    // Map governance gate based on labels
    for (const [label, value] of Object.entries(this.labelMap.governance_gate || {})) {
      if (labelsLower.includes(label)) {
        fieldUpdates['Governance Gate'] = value;
      }
    }

    // Map evidence required based on labels
    for (const [label, value] of Object.entries(this.labelMap.evidence_required || {})) {
      if (labelsLower.includes(label)) {
        fieldUpdates['Evidence Required'] = value;
      }
    }

    // Map control mapping based on labels
    for (const [label, values] of Object.entries(this.labelMap.control_mapping || {})) {
      if (labelsLower.includes(label)) {
        fieldUpdates['Control Mapping'] = [...new Set([...(fieldUpdates['Control Mapping'] || []), ...values])];
      }
    }

    // Map automation eligibility based on labels
    for (const [label, value] of Object.entries(this.labelMap.automation_eligibility || {})) {
      if (labelsLower.includes(label)) {
        fieldUpdates['Automation Eligibility'] = value;
      }
    }

    // Map work type based on labels
    for (const [label, value] of Object.entries(this.labelMap.work_type || {})) {
      if (labelsLower.includes(label)) {
        fieldUpdates['Work Type'] = value;
      }
    }

    // Map agents based on labels
    for (const [label, value] of Object.entries(this.labelMap.agent || {})) {
      if (labelsLower.includes(label)) {
        fieldUpdates['Primary Agent'] = value;
      }
    }

    // Map release blocker based on labels  
    for (const [label, value] of Object.entries(this.labelMap.release_blocker || {})) {
      if (labelsLower.includes(label)) {
        fieldUpdates['Release Blocker'] = value;
      }
    }

    // Map strategic theme based on labels
    for (const [label, value] of Object.entries(this.labelMap.strategic_theme || {})) {
      if (labelsLower.includes(label)) {
        fieldUpdates['Strategic Theme'] = value;
      }
    }

    // Map audit criticality based on labels
    for (const [label, value] of Object.entries(this.labelMap.audit_criticality || {})) {
      if (labelsLower.includes(label)) {
        fieldUpdates['Audit Criticality'] = value;
      }
    }

    return fieldUpdates;
  }

  /**
   * Map milestone to release train
   */
  mapMilestoneToReleaseTrain(milestone) {
    if (!milestone) return null;

    for (const mapping of this.labelMap.milestone_release_train || []) {
      if (milestone.toLowerCase().includes(mapping.pattern.toLowerCase())) {
        return mapping.value;
      }
    }

    return null;
  }

  /**
   * Map GitHub event to field updates
   */
  mapEventToFields(event) {
    const fieldUpdates = {};

    // Extract information from the event
    const payload = event.payload || event;
    const issueOrPr = payload.issue || payload.pull_request;

    if (issueOrPr) {
      // Map milestone if available
      const milestone = issueOrPr.milestone?.title;
      if (milestone) {
        const releaseTrain = this.mapMilestoneToReleaseTrain(milestone);
        if (releaseTrain) {
          fieldUpdates['Release Train'] = releaseTrain;
        }
      }

      // Map labels
      const labels = issueOrPr.labels?.map(label => typeof label === 'string' ? label : label.name) || [];
      const labelMappings = this.mapLabelsToFields(labels);
      Object.assign(fieldUpdates, labelMappings);

      // Map assignee to primary agent if applicable
      const assignees = issueOrPr.assignees || [];
      for (const assignee of assignees) {
        const username = typeof assignee === 'string' ? assignee : assignee.login;
        const lowerUsername = username.toLowerCase();
        
        const agentMap = {
          'jules': 'Jules',
          'codex': 'Codex',
          'claude': 'Claude',
          'qwen': 'Qwen',
          'atlas': 'Atlas',
          'anti': 'Antigravity',
          'gravity': 'Antigravity'
        };
        
        for (const [agentKeyword, agentName] of Object.entries(agentMap)) {
          if (lowerUsername.includes(agentKeyword)) {
            fieldUpdates['Primary Agent'] = agentName;
            break;
          }
        }
      }

      // Map priority from title
      if (issueOrPr.title && typeof issueOrPr.title === 'string') {
        const titleLower = issueOrPr.title.toLowerCase();
        if (titleLower.includes('p0') || titleLower.includes('critical')) {
          fieldUpdates['Priority'] = 'P0';
          fieldUpdates['WIP Risk'] = 'High';
        } else if (titleLower.includes('p1')) {
          fieldUpdates['Priority'] = 'P1';
          fieldUpdates['WIP Risk'] = 'Medium';
        } else if (titleLower.includes('p2')) {
          fieldUpdates['Priority'] = 'P2';
          fieldUpdates['WIP Risk'] = 'Low';
        } else if (titleLower.includes('p3')) {
          fieldUpdates['Priority'] = 'P3';
          fieldUpdates['WIP Risk'] = 'Low';
        }
        
        // Map blocked reason from title
        if (titleLower.includes('blocked')) {
          fieldUpdates['Blocked Reason'] = 'Dependency';
        } else if (titleLower.includes('security')) {
          fieldUpdates['Delivery Class'] = 'Security';
          fieldUpdates['Governance Gate'] = 'Security';
        } else if (titleLower.includes('compliance')) {
          fieldUpdates['Delivery Class'] = 'Compliance';
          fieldUpdates['Governance Gate'] = 'Compliance';
        } else if (titleLower.includes('infra') || titleLower.includes('infrastructure')) {
          fieldUpdates['Delivery Class'] = 'Infra';
          fieldUpdates['Governance Gate'] = 'Design';
        } else if (titleLower.includes('release')) {
          fieldUpdates['Delivery Class'] = 'Release';
          fieldUpdates['Governance Gate'] = 'Release';
        } else if (titleLower.includes('tech') && titleLower.includes('debt')) {
          fieldUpdates['Delivery Class'] = 'Tech Debt';
        }
      }

      // Map customer impact based on issue characteristics
      if (issueOrPr.body && typeof issueOrPr.body === 'string') {
        const bodyLower = issueOrPr.body.toLowerCase();
        if (bodyLower.includes('customer') && bodyLower.includes('facing')) {
          fieldUpdates['Customer Impact'] = 'GA';
        } else if (bodyLower.includes('pilot') || bodyLower.includes('beta')) {
          fieldUpdates['Customer Impact'] = 'Pilot';
        } else if (bodyLower.includes('internal')) {
          fieldUpdates['Customer Impact'] = 'Internal';
        }
      }
    }

    return fieldUpdates;
  }

  /**
   * Map workflow run to field updates
   */
  mapWorkflowRunToFields(workflowRun, artifacts = {}) {
    const fieldUpdates = {};

    // Find matching workflow configuration
    const workflowConfig = (this.workflowMap.workflows || []).find(config =>
      workflowRun.name && workflowRun.name.toLowerCase().includes(config.name_match.toLowerCase())
    );

    if (!workflowConfig) {
      // Set basic CI status from conclusion if no specific matching configuration exists
      fieldUpdates['CI Status Snapshot'] = this.mapConclusionToStatus(workflowRun.conclusion);
      return fieldUpdates; // No specific mapping configuration
    }

    // Map based on workflow conclusion
    fieldUpdates['CI Status Snapshot'] = this.mapConclusionToStatus(workflowRun.conclusion);

    // Process required artifacts
    for (const artifactName of workflowConfig.required_artifacts || []) {
      if (artifacts[artifactName]) {
        this.processArtifactMapping(artifacts[artifactName], fieldUpdates, artifactName);
      }
    }

    // Process optional artifacts
    for (const artifactName of workflowConfig.optional_artifacts || []) {
      if (artifacts[artifactName]) {
        this.processArtifactMapping(artifacts[artifactName], fieldUpdates, artifactName);
      }
    }

    // Mark that an artifact was produced if any artifacts exist
    if (Object.keys(artifacts).length > 0) {
      fieldUpdates['Artifact Produced'] = 'Yes';
    }

    return fieldUpdates;
  }

  /**
   * Map workflow conclusion to status
   */
  mapConclusionToStatus(conclusion) {
    if (!conclusion) return 'Unknown';
    
    switch (conclusion.toLowerCase()) {
      case 'success':
        return 'Green';
      case 'failure':
      case 'cancelled':
      case 'timed_out':
        return 'Failing';
      case 'skipped':
        return 'Unknown';
      case 'neutral':
        return 'Flaky';
      default:
        return 'Unknown';
    }
  }

  /**
   * Process artifact and map its content to field updates
   */
  processArtifactMapping(artifactData, fieldUpdates, artifactName) {
    try {
      if (typeof artifactData === 'string') {
        // Try to parse if it's string content
        try {
          artifactData = JSON.parse(artifactData);
        } catch {
          // If not JSON, skip processing
          return;
        }
      }

      // Get field mapping for this artifact type
      const artifactMapping = this.workflowMap.artifact_processing?.[artifactName] || 
                              this.workflowMap.artifact_processing?.[artifactName.replace('.json', '')];
                              
      if (artifactMapping && artifactMapping.field_mapping) {
        // Apply field mappings
        for (const [sourceField, targetField] of Object.entries(artifactMapping.field_mapping)) {
          const sourceValue = this.getNestedProperty(artifactData, sourceField);
          if (sourceValue !== undefined) {
            fieldUpdates[targetField] = sourceValue;
          }
        }
      }

      // Handle specific mappings for common artifact names
      switch (artifactName.replace('.json', '')) {
        case 'stamp':
        case 'stamp':
          if (artifactData.status) {
            fieldUpdates['CI Status Snapshot'] = artifactData.status;
          }
          if (artifactData.determinism_risk !== undefined) {
            fieldUpdates['Determinism Risk'] = artifactData.determinism_risk;
          }
          if (artifactData.evidence_bundle_id) {
            fieldUpdates['Evidence Bundle ID'] = artifactData.evidence_bundle_id;
          }
          if (artifactData.evidence_complete !== undefined) {
            fieldUpdates['Evidence Complete'] = artifactData.evidence_complete ? 'Yes' : 'No';
          }
          if (artifactData.policy_version) {
            fieldUpdates['Policy Version'] = artifactData.policy_version;
          }
          break;

        case 'report':
        case 'report':
          if (artifactData.determinism_risk) {
            fieldUpdates['Determinism Risk'] = artifactData.determinism_risk;
          }
          if (artifactData.gate_status) {
            fieldUpdates['Gate Status'] = artifactData.gate_status;
          }
          if (artifactData.evidence_complete !== undefined) {
            fieldUpdates['Evidence Complete'] = artifactData.evidence_complete ? 'Yes' : 'No';
          }
          if (artifactData.readiness_score !== undefined) {
            fieldUpdates['GA Readiness Score'] = artifactData.readiness_score;
          }
          break;

        case 'coverage-summary':
        case 'coverage-summary':
          if (artifactData.delta_percent !== undefined) {
            fieldUpdates['Test Coverage Delta'] = artifactData.delta_percent;
          }
          if (artifactData.current_percent !== undefined) {
            fieldUpdates['Current Coverage'] = artifactData.current_percent;
          }
          if (artifactData.baseline_percent !== undefined) {
            fieldUpdates['Baseline Coverage'] = artifactData.baseline_percent;
          }
          break;

        case 'security-results':
          if (artifactData.audit_criticality) {
            fieldUpdates['Audit Criticality'] = artifactData.audit_criticality;
          }
          if (artifactData.external_audit_scope !== undefined) {
            fieldUpdates['External Audit Scope'] = artifactData.external_audit_scope ? 'Yes' : 'No';
          }
          if (artifactData.critical_count !== undefined) {
            fieldUpdates['Critical Vulnerabilities'] = artifactData.critical_count;
          }
          if (artifactData.high_count !== undefined) {
            fieldUpdates['High Vulnerabilities'] = artifactData.high_count;
          }
          break;

        case 'compliance-results':
          if (artifactData.evidence_required !== undefined) {
            fieldUpdates['Evidence Required'] = artifactData.evidence_required ? 'Yes' : 'No';
          }
          if (artifactData.external_audit_scope !== undefined) {
            fieldUpdates['External Audit Scope'] = artifactData.external_audit_scope ? 'Yes' : 'No';
          }
          if (artifactData.frameworks) {
            fieldUpdates['Control Mapping'] = [...new Set([...(fieldUpdates['Control Mapping'] || []), ...artifactData.frameworks])];
          }
          break;

        default:
          // Generic processing for any artifact
          if (artifactData.ci_status) {
            fieldUpdates['CI Status Snapshot'] = artifactData.ci_status;
          }
          if (artifactData.determinism_risk) {
            fieldUpdates['Determinism Risk'] = artifactData.determinism_risk;
          }
          if (artifactData.policy_version) {
            fieldUpdates['Policy Version'] = artifactData.policy_version;
          }
      }
    } catch (error) {
      console.warn(`Could not process artifact mapping for ${artifactName}:`, error.message);
    }
  }

  /**
   * Get nested property using dot notation
   */
  getNestedProperty(obj, path) {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Apply cross-field mapping logic
   */
  applyCrossFieldMapping(fieldUpdates, originalFields = {}) {
    const updatedFields = { ...originalFields, ...fieldUpdates };

    // If Governance Gate is set to GA, ensure Evidence Required is Yes
    if (updatedFields['Governance Gate'] === 'GA' && !updatedFields['Evidence Required']) {
      updatedFields['Evidence Required'] = 'Yes';
    }

    // If Release Blocker is Yes, ensure high priority
    if (updatedFields['Release Blocker'] === 'Yes') {
      if (!updatedFields['Priority'] || updatedFields['Priority'] === 'P2' || updatedFields['Priority'] === 'P3' || updatedFields['Priority'] === 'P4') {
        updatedFields['Priority'] = 'P1'; // Elevate priority of release blockers
      }
      if (!updatedFields['Reputation Risk']) {
        updatedFields['Reputation Risk'] = 'High';
      }
    }

    // Map strategic theme based on other fields if not set explicitly
    if (!updatedFields['Strategic Theme']) {
      if (updatedFields['Governance Gate'] === 'GA') {
        updatedFields['Strategic Theme'] = 'GA Readiness';
      } else if (updatedFields['Governance Gate'] === 'Security') {
        updatedFields['Strategic Theme'] = 'Trust';
      } else if (updatedFields['Governance Gate'] === 'Compliance') {
        updatedFields['Strategic Theme'] = 'Trust';
      } else if (updatedFields['Delivery Class'] === 'Infra') {
        updatedFields['Strategic Theme'] = 'Scale';
      } else if (updatedFields['Delivery Class'] === 'Cost') {
        updatedFields['Strategic Theme'] = 'Cost';
      }
    }

    // Set Customer Impact based on other fields if not set
    if (!updatedFields['Customer Impact']) {
      if (updatedFields['Governance Gate'] === 'GA' || updatedFields['Release Train'] === 'GA') {
        updatedFields['Customer Impact'] = 'GA';
      } else if (updatedFields['External Audit Scope'] === 'Yes') {
        updatedFields['Customer Impact'] = 'Pilot';
      } else if (updatedFields['Delivery Class'] === 'Infra' || updatedFields['Delivery Class'] === 'Security') {
        updatedFields['Customer Impact'] = 'Internal';
      } else {
        updatedFields['Customer Impact'] = 'None';
      }
    }

    // Set Revenue Sensitivity based on other fields if not set
    if (!updatedFields['Revenue Sensitivity']) {
      if (updatedFields['Customer Impact'] === 'GA') {
        updatedFields['Revenue Sensitivity'] = 'Direct';
      } else if (updatedFields['Customer Impact'] === 'Pilot') {
        updatedFields['Revenue Sensitivity'] = 'Indirect';
      } else if (updatedFields['Delivery Class'] === 'Revenue') {
        updatedFields['Revenue Sensitivity'] = 'Direct';
      } else {
        updatedFields['Revenue Sensitivity'] = 'None';
      }
    }

    // Set Reputation Risk based on other fields if not set
    if (!updatedFields['Reputation Risk']) {
      if (updatedFields['Priority'] === 'P0') {
        updatedFields['Reputation Risk'] = 'Existential';
      } else if (updatedFields['Priority'] === 'P1') {
        updatedFields['Reputation Risk'] = 'High';
      } else if (updatedFields['Priority'] === 'P2') {
        updatedFields['Reputation Risk'] = 'Medium';
      } else {
        updatedFields['Reputation Risk'] = 'Low';
      }
    }

    return updatedFields;
  }

  /**
   * Validate field mappings against schema
   */
  validateMappings(fieldUpdates, schema) {
    const errors = [];

    if (!schema?.fields) {
      // If no schema provided, we can't validate
      return { valid: true, errors: [] };
    }

    // Create a map of field names to allowed values for validation
    const allowedValues = new Map();
    
    for (const field of schema.fields) {
      if (field.type === 'single_select' && Array.isArray(field.options)) {
        allowedValues.set(field.name, new Set(field.options.map(opt => opt.name)));
      } else if (field.type === 'multi_select' && Array.isArray(field.options)) {
        allowedValues.set(field.name, new Set(field.options.map(opt => opt.name)));
      }
    }

    for (const [fieldName, value] of Object.entries(fieldUpdates)) {
      const allowedOptions = allowedValues.get(fieldName);
      if (allowedOptions) {
        if (Array.isArray(value)) {
          // For multi-select fields, validate each option
          for (const val of value) {
            if (typeof val === 'string' && !allowedOptions.has(val) && !allowedOptions.has(val.toLowerCase())) {
              errors.push(`Invalid option '${val}' for multi-select field '${fieldName}'. Valid options: ${Array.from(allowedOptions).join(', ')}`);
            }
          }
        } else if (typeof value === 'string' && !allowedOptions.has(value) && !allowedOptions.has(value.toLowerCase())) {
          errors.push(`Invalid option '${value}' for field '${fieldName}'. Valid options: ${Array.from(allowedOptions).join(', ')}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get field updates based on event type and data
   */
  getFieldUpdates(eventType, eventData) {
    let fieldUpdates = {};

    switch (eventType) {
      case 'issues.opened':
      case 'issues.labeled':
      case 'issues.unlabeled':
      case 'issues.milestoned':
      case 'issues.demilestoned':
        // Handle issue-related events
        fieldUpdates = this.mapEventToFields({ payload: eventData });
        break;
        
      case 'pull_request.opened':
      case 'pull_request.labeled':
      case 'pull_request.unlabeled':
      case 'pull_request.ready_for_review':
      case 'pull_request.closed':
        // Handle PR-related events
        fieldUpdates = this.mapEventToFields({ payload: eventData });
        break;
        
      case 'workflow_run.completed':
        // Handle workflow completion events
        fieldUpdates = this.mapWorkflowRunToFields(eventData.workflow_run, eventData.artifacts || {});
        break;

      default:
        // For other event types, attempt generic mapping
        fieldUpdates = this.mapEventToFields(eventData);
    }

    // Apply cross-field mapping logic
    fieldUpdates = this.applyCrossFieldMapping(fieldUpdates);

    return fieldUpdates;
  }

  /**
   * Generate a mapping plan based on current state vs. desired mappings
   */
  generateMappingPlan(currentItems, desiredMappings) {
    const plan = {
      items: [],
      totalUpdates: 0,
      errors: []
    };

    for (const item of currentItems) {
      try {
        const currentState = item.fields || {};
        const desiredState = this.deriveDesiredState(item, desiredMappings);
        
        const updatesNeeded = this.computeFieldUpdates(currentState, desiredState);
        
        if (updatesNeeded.length > 0) {
          plan.items.push({
            itemId: item.id,
            updates: updatesNeeded
          });
          plan.totalUpdates += updatesNeeded.length;
        }
      } catch (error) {
        plan.errors.push({
          itemId: item.id,
          error: error.message
        });
      }
    }

    return plan;
  }

  /**
   * Derive the desired state for an item based on its content and mappings
   */
  deriveDesiredState(item, mappings) {
    const desired = { ...item.fields };
    
    // Apply label-based mappings
    const labels = item.content?.labels?.map(l => l.name) || [];
    const labelUpdates = this.mapLabelsToFields(labels);
    Object.assign(desired, labelUpdates);

    // Apply milestone mapping
    const milestone = item.content?.milestone?.title;
    if (milestone) {
      const releaseTrain = this.mapMilestoneToReleaseTrain(milestone);
      if (releaseTrain) {
        desired['Release Train'] = releaseTrain;
      }
    }

    return this.applyCrossFieldMapping(desired);
  }

  /**
   * Compute field updates needed to go from current to desired state
   */
  computeFieldUpdates(currentState, desiredState) {
    const updates = [];

    for (const [field, desiredValue] of Object.entries(desiredState)) {
      const currentValue = currentState[field];
      
      if (!this.valuesEqual(currentValue, desiredValue)) {
        updates.push({
          field,
          from: currentValue,
          to: desiredValue
        });
      }
    }

    return updates;
  }

  /**
   * Check if two values are equal (handles different data types)
   */
  valuesEqual(val1, val2) {
    if (val1 === val2) return true;
    
    // Check for arrays
    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length !== val2.length) return false;
      return val1.every((v, i) => this.valuesEqual(v, val2[i]));
    }
    
    // Check for objects
    if (val1 && typeof val1 === 'object' && val2 && typeof val2 === 'object') {
      const keys1 = Object.keys(val1).sort();
      const keys2 = Object.keys(val2).sort();
      
      if (keys1.length !== keys2.length) return false;
      if (keys1.some(k => !keys2.includes(k))) return false;
      
      return keys1.every(k => this.valuesEqual(val1[k], val2[k]));
    }
    
    // For other types, convert to string for comparison
    return String(val1) === String(val2);
  }
}

export default MappingOperations;