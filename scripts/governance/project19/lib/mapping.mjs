/**
 * Mapping Operations
 * Handles the mapping of GitHub events, labels, and milestones to Project fields
 */

import fs from 'fs';

class MappingOperations {
  constructor(labelMapPath, workflowMapPath) {
    this.labelMap = this.loadConfig(labelMapPath, {});
    this.workflowMap = this.loadConfig(workflowMapPath, {});
  }

  /**
   * Load configuration from file
   */
  loadConfig(path, defaultValue) {
    if (!fs.existsSync(path)) {
      console.warn(`Config file not found: ${path}, using default`);
      return defaultValue;
    }

    const content = fs.readFileSync(path, 'utf8');
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error parsing config file ${path}:`, error.message);
      return defaultValue;
    }
  }

  /**
   * Map GitHub event labels to project field values
   */
  mapLabelsToFields(labels) {
    const fieldUpdates = {};
    const labelsLower = labels.map(l => l.toLowerCase());

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
   * Map GitHub event to basic field updates
   */
  mapGithubEventToFields(event) {
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
      const labels = issueOrPr.labels?.map(label => label.name.toLowerCase()) || [];
      const labelMappings = this.mapLabelsToFields(labels);
      Object.assign(fieldUpdates, labelMappings);

      // Map assignee to primary agent if applicable
      const assignees = issueOrPr.assignees || [];
      for (const assignee of assignees) {
        const username = assignee.login.toLowerCase();
        const agentMap = {
          'jules': 'Jules',
          'codex': 'Codex',
          'claude': 'Claude',
          'qwen': 'Qwen',
          'atlas': 'Atlas',
          'antigravity': 'Antigravity'
        };
        
        for (const [agentKeyword, agentName] of Object.entries(agentMap)) {
          if (username.includes(agentKeyword)) {
            fieldUpdates['Primary Agent'] = agentName;
            break;
          }
        }
      }

      // Map priority based on issue/PR characteristics
      if (issueOrPr.title && (issueOrPr.title.toLowerCase().includes('p0') || issueOrPr.title.toLowerCase().includes('critical'))) {
        fieldUpdates['Priority'] = 'P0';
        fieldUpdates['WIP Risk'] = 'High';
      } else if (issueOrPr.title && issueOrPr.title.toLowerCase().includes('p1')) {
        fieldUpdates['Priority'] = 'P1';
        fieldUpdates['WIP Risk'] = 'Medium';
      }

      // Map blocked reason from title
      if (issueOrPr.title && issueOrPr.title.toLowerCase().includes('blocked')) {
        fieldUpdates['Blocked Reason'] = 'Dependency';
      }

      // Map delivery class from title
      if (issueOrPr.title) {
        const titleLower = issueOrPr.title.toLowerCase();
        if (titleLower.includes('security')) {
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
    const workflowConfig = this.workflowMap.workflows?.find(config =>
      workflowRun.name.toLowerCase().includes(config.name_match.toLowerCase())
    );

    if (!workflowConfig) {
      return fieldUpdates; // No matching configuration
    }

    // Map based on workflow conclusion
    fieldUpdates['CI Status Snapshot'] = this.mapConclusionToStatus(workflowRun.conclusion);

    // Process required artifacts
    for (const artifactName of workflowConfig.required_artifacts || []) {
      if (artifacts[artifactName]) {
        this.processArtifact(artifacts[artifactName], fieldUpdates);
      }
    }

    // Process optional artifacts
    for (const artifactName of workflowConfig.optional_artifacts || []) {
      if (artifacts[artifactName]) {
        this.processArtifact(artifacts[artifactName], fieldUpdates);
      }
    }

    // Mark that an artifact was produced
    if (Object.keys(artifacts).length > 0) {
      fieldUpdates['Artifact Produced'] = 'Yes';
    }

    return fieldUpdates;
  }

  /**
   * Map workflow conclusion to status
   */
  mapConclusionToStatus(conclusion) {
    switch (conclusion) {
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
   * Process an artifact to update fields
   */
  processArtifact(artifactData, fieldUpdates) {
    try {
      // Handle stamp.json artifact
      if (artifactData.stamp) {
        const stamp = artifactData.stamp;
        fieldUpdates['Policy Version'] = stamp.policy_version || 'Unknown';
        fieldUpdates['Evidence Bundle ID'] = stamp.evidence_bundle_id || 'None';
        fieldUpdates['Evidence Complete'] = stamp.evidence_complete ? 'Yes' : 'No';
        fieldUpdates['Determinism Risk'] = stamp.determinism_risk || 'None';
      }

      // Handle report.json artifact
      if (artifactData.report) {
        const report = artifactData.report;
        if (report.determinism_risk) {
          fieldUpdates['Determinism Risk'] = report.determinism_risk;
        }
        if (report.gate_status) {
          // Update gate status based on report
          for (const [gate, status] of Object.entries(report.gate_status)) {
            // Could potentially update specific gate fields here
          }
        }
      }

      // Handle coverage artifact
      if (artifactData.coverage) {
        const coverage = artifactData.coverage;
        if (coverage.delta_percent !== undefined) {
          fieldUpdates['Test Coverage Delta'] = coverage.delta_percent;
        }
      }

      // Handle security results
      if (artifactData.security_results) {
        const security = artifactData.security_results;
        if (security.audit_criticality) {
          fieldUpdates['Audit Criticality'] = security.audit_criticality;
        }
        if (security.external_audit_scope) {
          fieldUpdates['External Audit Scope'] = security.external_audit_scope ? 'Yes' : 'No';
        }
      }

      // Handle compliance results
      if (artifactData.compliance_results) {
        const compliance = artifactData.compliance_results;
        if (compliance.evidence_required !== undefined) {
          fieldUpdates['Evidence Required'] = compliance.evidence_required ? 'Yes' : 'No';
        }
        if (compliance.frameworks) {
          fieldUpdates['Control Mapping'] = [...new Set([...(fieldUpdates['Control Mapping'] || []), ...compliance.frameworks])];
        }
      }
    } catch (error) {
      console.warn('Error processing artifact:', error.message);
    }
  }

  /**
   * Apply cross-field mapping logic
   */
  applyCrossFieldMapping(fieldUpdates) {
    const updatedFields = { ...fieldUpdates };

    // If Governance Gate is set to GA, ensure Evidence Required is Yes
    if (updatedFields['Governance Gate'] === 'GA' && !updatedFields['Evidence Required']) {
      updatedFields['Evidence Required'] = 'Yes';
    }

    // If Release Blocker is Yes, increase priority
    if (updatedFields['Release Blocker'] === 'Yes') {
      if (!updatedFields['Priority'] || !updatedFields['Priority'].startsWith('P')) {
        updatedFields['Priority'] = 'P1';
      }
      if (!updatedFields['Reputation Risk']) {
        updatedFields['Reputation Risk'] = 'High';
      }
    }

    // Map strategic theme based on other fields
    if (!updatedFields['Strategic Theme']) {
      if (updatedFields['Governance Gate'] === 'GA') {
        updatedFields['Strategic Theme'] = 'GA Readiness';
      } else if (updatedFields['Governance Gate'] === 'Security') {
        updatedFields['Strategic Theme'] = 'Trust';
      } else if (updatedFields['Delivery Class'] === 'Infra') {
        updatedFields['Strategic Theme'] = 'Scale';
      }
    }

    // Set Customer Impact based on other fields
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

    // Set Revenue Sensitivity based on other fields
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

    return updatedFields;
  }

  /**
   * Validate field mappings against schema
   */
  validateMappings(fieldUpdates, schema) {
    const errors = [];

    if (!schema || !schema.fields) {
      return { valid: true, errors: [] };
    }

    for (const [fieldName, value] of Object.entries(fieldUpdates)) {
      // Find the field definition in the schema
      const fieldDef = schema.fields.find(f => f.name === fieldName);
      if (!fieldDef) {
        // Field not defined in schema, might be a computed field
        continue;
      }

      // Validate value type
      switch (fieldDef.type) {
        case 'single_select':
          if (fieldDef.options) {
            const validOptions = new Set(fieldDef.options.map(opt => opt.name));
            if (Array.isArray(value)) {
              // Multiple select field
              for (const val of value) {
                if (!validOptions.has(val)) {
                  errors.push(`Invalid option '${val}' for field '${fieldName}'. Valid options: ${Array.from(validOptions).join(', ')}`);
                }
              }
            } else if (typeof value === 'string' && !validOptions.has(value)) {
              errors.push(`Invalid option '${value}' for field '${fieldName}'. Valid options: ${Array.from(validOptions).join(', ')}`);
            }
          }
          break;
        case 'number':
          if (typeof value === 'string') {
            const numVal = Number(value);
            if (isNaN(numVal)) {
              errors.push(`Invalid number value '${value}' for field '${fieldName}'`);
            } else {
              if (fieldDef.number?.min !== undefined && numVal < fieldDef.number.min) {
                errors.push(`Value ${numVal} for field '${fieldName}' is below minimum ${fieldDef.number.min}`);
              }
              if (fieldDef.number?.max !== undefined && numVal > fieldDef.number.max) {
                errors.push(`Value ${numVal} for field '${fieldName}' is above maximum ${fieldDef.number.max}`);
              }
            }
          } else if (typeof value !== 'number') {
            errors.push(`Invalid value type for field '${fieldName}', expected number`);
          }
          break;
        case 'date':
          if (typeof value === 'string') {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
              errors.push(`Invalid date value '${value}' for field '${fieldName}'`);
            }
          } else {
            errors.push(`Invalid value type for field '${fieldName}', expected date string`);
          }
          break;
        case 'checkbox':
          if (typeof value !== 'boolean' && value !== 'Yes' && value !== 'No') {
            errors.push(`Invalid value type for checkbox field '${fieldName}', expected boolean or Yes/No`);
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get field updates by event type and data
   */
  getFieldUpdates(eventType, eventData) {
    let fieldUpdates = {};

    switch (eventType) {
      case 'issues_opened':
      case 'issues_labeled':
      case 'issues_unlabeled':
        fieldUpdates = this.mapGithubEventToFields({ payload: eventData });
        break;
      case 'issues_milestoned':
      case 'issues_demilestoned':
        fieldUpdates = this.mapGithubEventToFields({ payload: eventData });
        break;
      case 'workflow_run_completed':
        fieldUpdates = this.mapWorkflowRunToFields(eventData.workflow_run, eventData.artifacts);
        break;
      case 'pull_request_opened':
      case 'pull_request_labeled':
      case 'pull_request_unlabeled':
        fieldUpdates = this.mapGithubEventToFields({ payload: eventData });
        break;
      case 'issues_assigned':
      case 'issues_unassigned':
        fieldUpdates = this.mapGithubEventToFields({ payload: eventData });
        break;
      default:
        // For other event types, still try to extract basic information
        fieldUpdates = this.mapGithubEventToFields(eventData);
    }

    // Apply cross-field mapping logic
    fieldUpdates = this.applyCrossFieldMapping(fieldUpdates);

    return fieldUpdates;
  }

  /**
   * Create a mapping plan from current state to desired state
   */
  generateMappingPlan(currentItems, desiredMappings) {
    const plan = {
      updates: [],
      noChanges: [],
      errors: []
    };

    for (const item of currentItems) {
      try {
        // For each item, determine what updates are needed
        const currentState = item.fields || {};
        const desiredState = this.deriveDesiredState(item, desiredMappings);
        
        const updatesNeeded = this.computeUpdates(currentState, desiredState);
        
        if (updatesNeeded.length > 0) {
          plan.updates.push({
            itemId: item.id,
            updates: updatesNeeded
          });
        } else {
          plan.noChanges.push(item.id);
        }
      } catch (error) {
        plan.errors.push({
          item: item.id,
          error: error.message
        });
      }
    }

    return plan;
  }

  /**
   * Derive the desired state based on content and mappings
   */
  deriveDesiredState(item, mappings) {
    const desired = { ...item.fields };
    
    // Apply label-based mappings
    const labels = item.content?.labels?.map(l => l.name.toLowerCase()) || [];
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

    // Apply cross-field mappings
    return this.applyCrossFieldMapping(desired);
  }

  /**
   * Compute updates needed to go from current to desired state
   */
  computeUpdates(currentState, desiredState) {
    const updates = [];

    for (const [field, desiredValue] of Object.entries(desiredState)) {
      const currentValue = currentState[field];
      
      if (this.valuesDiffer(currentValue, desiredValue)) {
        updates.push({
          field,
          currentValue,
          desiredValue
        });
      }
    }

    return updates;
  }

  /**
   * Check if two values differ (handles arrays, objects, primitives)
   */
  valuesDiffer(val1, val2) {
    if (val1 === val2) return false;
    
    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length !== val2.length) return true;
      for (let i = 0; i < val1.length; i++) {
        if (val1[i] !== val2[i]) return true;
      }
      return false;
    }

    return true;
  }
}

export default MappingOperations;