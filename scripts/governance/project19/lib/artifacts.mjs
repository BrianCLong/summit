/**
 * Artifacts Operations Library
 * Handles downloading, parsing, and processing CI/CD artifacts
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

class ArtifactsOperations {
  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'project19-artifacts');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Download workflow artifacts from GitHub Actions
   */
  async downloadWorkflowArtifacts(octokit, owner, repo, runId) {
    try {
      const { data: artifacts } = await octokit.actions.listWorkflowRunArtifacts({
        owner,
        repo,
        run_id: runId
      });

      const downloadedArtifacts = {};

      for (const artifact of artifacts.artifacts) {
        // Skip expired artifacts
        const expiresAt = new Date(artifact.expires_at);
        const now = new Date();
        if (expiresAt < now) {
          console.warn(`Skipping expired artifact: ${artifact.name} (expired: ${expiresAt.toISOString()})`);
          continue;
        }

        try {
          // Download the artifact
          const response = await octokit.actions.downloadArtifact({
            owner,
            repo,
            artifact_id: artifact.id,
            archive_format: 'zip'
          });

          // Create temp directory for this artifact
          const tempDir = path.join(this.tempDir, `artifact_${artifact.id}_${Date.now()}`);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          // Save the zip file temporarily
          const zipPath = path.join(tempDir, `${artifact.name}.zip`);
          fs.writeFileSync(zipPath, response.data);

          // Extract the zip file
          await this.extractZip(zipPath, tempDir);

          // Process extracted files
          const extractedFiles = await this.processExtractedFiles(tempDir);
          downloadedArtifacts[artifact.name] = extractedFiles;
          
          // Clean up zip file
          fs.unlinkSync(zipPath);
        } catch (error) {
          console.warn(`Could not download artifact ${artifact.name}: ${error.message}`);
        }
      }

      return downloadedArtifacts;
    } catch (error) {
      console.error(`Error downloading workflow artifacts for run ${runId}:`, error.message);
      throw error;
    }
  }

  /**
   * Extract a ZIP file (uses system tools for efficiency)
   */
  async extractZip(zipPath, extractPath) {
    return new Promise((resolve, reject) => {
      const child = spawn('unzip', ['-q', '-o', zipPath, '-d', extractPath]);
      
      let stderr = '';
      child.stderr.on('data', (data) => stderr += data.toString());
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          reject(new Error(`Failed to extract zip: ${stderr || `Process exited with code ${code}`}`));
        }
      });
      
      child.on('error', (error) => {
        reject(new Error(`Error spawning extract process: ${error.message}`));
      });
    });
  }

  /**
   * Process extracted files
   */
  async processExtractedFiles(extractPath) {
    const processedFiles = {};
    
    // Read all files in the extracted directory
    const files = fs.readdirSync(extractPath, { withFileTypes: true });
    
    for (const file of files) {
      if (file.isDirectory()) {
        // Skip the original archive file and process subdirectories
        if (file.name !== path.basename(extractPath)) {
          const subDirPath = path.join(extractPath, file.name);
          processedFiles[file.name] = await this.processExtractedFiles(subDirPath);
        }
      } else if (file.isFile() && file.name !== path.basename(extractPath)) {
        const filePath = path.join(extractPath, file.name);
        const fileExtension = path.extname(file.name).toLowerCase();
        
        try {
          if (fileExtension === '.json') {
            // Parse JSON content
            const content = fs.readFileSync(filePath, 'utf8');
            processedFiles[file.name] = JSON.parse(content);
          } else if (fileExtension === '.txt' || fileExtension === '.log' || fileExtension === '.md') {
            // Read text content
            processedFiles[file.name] = fs.readFileSync(filePath, 'utf8');
          } else {
            // For other file types, store as base64
            const content = fs.readFileSync(filePath);
            processedFiles[file.name] = content.toString('base64');
          }
        } catch (error) {
          console.warn(`Could not process file ${file.name}: ${error.message}`);
          processedFiles[file.name + '_error'] = error.message;
        }
      }
    }
    
    return processedFiles;
  }

  /**
   * Parse evidence artifacts specifically
   */
  parseEvidenceArtifacts(artifacts) {
    const evidence = {
      bundles: [],
      completeness: 0,
      validity: true,
      issues: []
    };

    if (artifacts['evidence-bundle']) {
      // Process evidence bundle artifacts
      const bundle = artifacts['evidence-bundle'];
      evidence.bundles.push({
        id: bundle.bundle_id || 'unknown',
        timestamp: bundle.timestamp || new Date().toISOString(),
        artifacts: bundle.artifacts || [],
        valid: bundle.valid !== false
      });
    }

    if (artifacts['stamp.json']) {
      const stamp = artifacts['stamp.json'];
      evidence.bundleId = stamp.evidence_bundle_id;
      
      if (stamp.evidence_complete !== undefined) {
        evidence.completeness = stamp.evidence_complete ? 100 : 0;
      }
      
      if (stamp.determinism_risk) {
        evidence.determinismRisk = stamp.determinism_risk;
      }
      
      if (stamp.validation_errors) {
        evidence.issues.push(...stamp.validation_errors);
        evidence.validity = stamp.validation_errors.length === 0;
      }
    }

    if (artifacts['report.json']) {
      const report = artifacts['report.json'];
      if (report.evidence_issues) {
        evidence.issues.push(...report.evidence_issues);
      }
      
      if (report.determinism_risk) {
        evidence.determinismRisk = report.determinism_risk;
      }
    }

    return evidence;
  }

  /**
   * Parse CI/CD related artifacts for status signals
   */
  parseCIArtifacts(artifacts) {
    const ciSignals = {
      status: 'Unknown',
      artifactsProduced: false,
      determinismRisk: 'None',
      testCoverageDelta: 0,
      gateStatus: {},
      validationResults: {}
    };

    // Parse stamp.json for CI signals
    const stampArtifact = artifacts['stamp.json'] || artifacts.stamp;
    if (stampArtifact) {
      if (stampArtifact.status) ciSignals.status = stampArtifact.status;
      if (stampArtifact.determinism_risk) ciSignals.determinismRisk = stampArtifact.determinism_risk;
      if (stampArtifact.policy_version) ciSignals.policyVersion = stampArtifact.policy_version;
      if (stampArtifact.evidence_bundle_id) ciSignals.evidenceBundleId = stampArtifact.evidence_bundle_id;
      if (stampArtifact.evidence_complete !== undefined) ciSignals.evidenceComplete = stampArtifact.evidence_complete;
    }

    // Parse report.json for detailed results
    const reportArtifact = artifacts['report.json'] || artifacts.report;
    if (reportArtifact) {
      if (reportArtifact.determinism_risk) ciSignals.determinismRisk = reportArtifact.determinism_risk;
      if (reportArtifact.gate_status) ciSignals.gateStatus = reportArtifact.gate_status;
      if (reportArtifact.validation_results) ciSignals.validationResults = reportArtifact.validation_results;
    }

    // Parse coverage-summary.json for coverage delta
    const coverageArtifact = artifacts['coverage-summary.json'] || artifacts['coverage-summary'];
    if (coverageArtifact) {
      if (coverageArtifact.delta_percent !== undefined) {
        ciSignals.testCoverageDelta = coverageArtifact.delta_percent;
      }
      if (coverageArtifact.current_percent !== undefined) {
        ciSignals.currentCoverage = coverageArtifact.current_percent;
      }
      if (coverageArtifact.baseline_percent !== undefined) {
        ciSignals.baselineCoverage = coverageArtifact.baseline_percent;
      }
    }

    // Check if any artifacts were produced
    ciSignals.artifactsProduced = Object.keys(artifacts).length > 0;

    return ciSignals;
  }

  /**
   * Parse security-related artifacts
   */
  parseSecurityArtifacts(artifacts) {
    const securitySignals = {
      auditCriticality: 'Informational',
      externalAuditScope: false,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      findings: [],
      securityScore: 100
    };

    const securityArtifact = artifacts['security-results.json'] || artifacts['security-results'];
    if (securityArtifact) {
      if (securityArtifact.audit_criticality) {
        securitySignals.auditCriticality = securityArtifact.audit_criticality;
      }
      if (securityArtifact.external_audit_scope !== undefined) {
        securitySignals.externalAuditScope = securityArtifact.external_audit_scope;
      }
      if (securityArtifact.vulnerabilities) {
        for (const vuln of securityArtifact.vulnerabilities) {
          securitySignals.findings.push({
            severity: vuln.severity,
            id: vuln.id,
            title: vuln.title,
            description: vuln.description
          });

          switch ((vuln.severity || '').toLowerCase()) {
            case 'critical':
              securitySignals.criticalCount++;
              break;
            case 'high':
              securitySignals.highCount++;
              break;
            case 'medium':
              securitySignals.mediumCount++;
              break;
            case 'low':
              securitySignals.lowCount++;
              break;
          }
        }
      }
    }

    // Calculate security score based on findings
    const totalVulns = securitySignals.criticalCount * 10 + 
                       securitySignals.highCount * 5 +
                       securitySignals.mediumCount * 2 +
                       securitySignals.lowCount * 0.5;
    securitySignals.securityScore = Math.max(0, Math.round(100 - totalVulns));

    return securitySignals;
  }

  /**
   * Parse compliance-related artifacts
   */
  parseComplianceArtifacts(artifacts) {
    const complianceSignals = {
      evidenceRequired: false,
      frameworks: [],
      controlsMapped: [],
      complianceStatus: 'unknown',
      frameworkCoverage: {},
      outstandingItems: [],
      auditFindings: []
    };

    const complianceArtifact = artifacts['compliance-results.json'] || artifacts['compliance-results'];
    if (complianceArtifact) {
      if (complianceArtifact.evidence_required !== undefined) {
        complianceSignals.evidenceRequired = complianceArtifact.evidence_required;
      }
      if (complianceArtifact.frameworks) {
        complianceSignals.frameworks = complianceArtifact.frameworks;
      }
      if (complianceArtifact.controls_mapped) {
        complianceSignals.controlsMapped = complianceArtifact.controls_mapped;
      }
      if (complianceArtifact.status) {
        complianceSignals.complianceStatus = complianceArtifact.status;
      }
      if (complianceArtifact.framework_coverage) {
        complianceSignals.frameworkCoverage = complianceArtifact.framework_coverage;
      }
      if (complianceArtifact.outstanding_items) {
        complianceSignals.outstandingItems = complianceArtifact.outstanding_items;
      }
      if (complianceArtifact.audit_findings) {
        complianceSignals.auditFindings = complianceArtifact.audit_findings;
      }
    }

    return complianceSignals;
  }

  /**
   * Extract all signals from artifacts
   */
  extractSignalsFromArtifacts(artifacts) {
    return {
      evidence: this.parseEvidenceArtifacts(artifacts),
      ci: this.parseCIArtifacts(artifacts),
      security: this.parseSecurityArtifacts(artifacts),
      compliance: this.parseComplianceArtifacts(artifacts),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Map artifact signals to project field values
   */
  mapArtifactSignalsToFields(signals) {
    const fieldUpdates = {};

    // Map CI signals
    if (signals.ci) {
      fieldUpdates['CI Status Snapshot'] = signals.ci.status;
      fieldUpdates['Artifact Produced'] = signals.ci.artifactsProduced ? 'Yes' : 'No';
      fieldUpdates['Determinism Risk'] = signals.ci.determinismRisk;
      fieldUpdates['Test Coverage Delta'] = signals.ci.testCoverageDelta;
      fieldUpdates['Policy Version'] = signals.ci.policyVersion;
      fieldUpdates['Evidence Bundle ID'] = signals.ci.evidenceBundleId;
      fieldUpdates['Evidence Complete'] = signals.ci.evidenceComplete ? 'Yes' : 'No';
    }

    // Map security signals
    if (signals.security) {
      fieldUpdates['Audit Criticality'] = signals.security.auditCriticality;
      fieldUpdates['External Audit Scope'] = signals.security.externalAuditScope ? 'Yes' : 'No';
    }

    // Map compliance signals
    if (signals.compliance) {
      fieldUpdates['Evidence Required'] = signals.compliance.evidenceRequired ? 'Yes' : 'No';
      fieldUpdates['Control Mapping'] = signals.compliance.frameworks;
    }

    return fieldUpdates;
  }

  /**
   * Save processed artifacts to file for later reference
   */
  saveArtifactsToFile(artifacts, filepath) {
    const data = {
      timestamp: new Date().toISOString(),
      runId: 'unknown', // Would be passed in from context
      artifacts: artifacts,
      signals: this.extractSignalsFromArtifacts(artifacts)
    };

    // Ensure directory exists
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    return filepath;
  }

  /**
   * Load previously saved artifacts
   */
  loadArtifactsFromFile(filepath) {
    if (!fs.existsSync(filepath)) {
      throw new Error(`Artifact file not found: ${filepath}`);
    }

    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Cleanup temporary files
   */
  cleanupTempFiles() {
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
  }

  /**
   * Validate artifact structure against expected schema
   */
  validateArtifactStructure(artifactName, artifactContent) {
    const expectedSchemas = {
      'stamp.json': {
        required: ['status', 'timestamp', 'policy_version'],
        optional: ['evidence_bundle_id', 'evidence_complete', 'determinism_risk', 'validation_errors']
      },
      'report.json': {
        required: ['summary'],
        optional: ['details', 'violations', 'determinism_risk', 'gate_status', 'validation_results']
      },
      'coverage-summary.json': {
        required: ['delta_percent'],
        optional: ['current_percent', 'baseline_percent', 'file_details']
      },
      'security-results.json': {
        required: ['findings'],
        optional: ['critical_count', 'high_count', 'audit_criticality', 'external_audit_scope']
      },
      'compliance-results.json': {
        required: ['frameworks'],
        optional: ['evidence_required', 'controls_mapped', 'status', 'framework_coverage', 'outstanding_items']
      }
    };

    const schema = expectedSchemas[artifactName];
    if (!schema) {
      // No schema for this artifact type, consider valid
      return { valid: true, errors: [] };
    }

    const errors = [];
    const content = typeof artifactContent === 'string' ? JSON.parse(artifactContent) : artifactContent;

    for (const field of schema.required) {
      if (!(field in content)) {
        errors.push(`Missing required field: ${field} in ${artifactName}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default ArtifactsOperations;