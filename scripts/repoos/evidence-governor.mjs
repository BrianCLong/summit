#!/usr/bin/env node
/**
 * Evidence-Bound Governance Engine
 *
 * Enforces machine-verifiable evidence requirements for architectural decisions.
 * Every architecture change must include deterministic evidence artifacts.
 *
 * Beyond FAANG Innovation: Evidence-driven governance vs opinion-based decisions
 *
 * Constitutional Laws:
 *   LAW-8: Architecture changes require evidence bundle
 *   LAW-9: Evidence must validate deterministic outcomes
 *   LAW-10: Governance decisions must be reproducible
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Evidence bundle schema
 */
const EVIDENCE_SCHEMA = {
  required_artifacts: [
    'impact-analysis.json',
    'dependency-diff.json',
    'stability-simulation.json',
    'architecture-rationale.md'
  ],
  optional_artifacts: [
    'performance-analysis.json',
    'security-impact.json',
    'migration-plan.json'
  ]
};

/**
 * Confidence thresholds
 */
const THRESHOLDS = {
  minimum_confidence: 0.65,
  auto_approve_confidence: 0.85,
  high_risk_confidence: 0.75
};

/**
 * Check if PR requires evidence bundle
 */
async function requiresEvidenceBundle(prNumber) {
  try {
    const prJson = execSync(
      `gh pr view ${prNumber} --json files,title,labels,body`,
      { encoding: 'utf-8' }
    );

    const pr = JSON.parse(prJson);
    const files = pr.files || [];
    const title = (pr.title || '').toLowerCase();
    const labels = (pr.labels || []).map(l => l.name.toLowerCase());

    // Architecture changes
    if (labels.includes('architecture') || /architecture|refactor|restructure/i.test(title)) {
      return { required: true, reason: 'architecture-change' };
    }

    // Interface spine modifications
    const touchesInterface = files.some(f =>
      f.path.includes('platform-interface/') ||
      /\.contract\.ts$/.test(f.path)
    );

    if (touchesInterface) {
      return { required: true, reason: 'interface-modification' };
    }

    // Constitutional changes
    const touchesConstitution = files.some(f =>
      f.path.includes('.repoos/') ||
      f.path.includes('scripts/repoos/')
    );

    if (touchesConstitution && files.length > 5) {
      return { required: true, reason: 'constitutional-change' };
    }

    // Large cross-domain changes
    const domains = new Set();
    for (const file of files) {
      const domain = classifyDomain(file.path);
      domains.add(domain);
    }

    if (domains.size > 2 && files.length > 15) {
      return { required: true, reason: 'cross-domain-change' };
    }

    return { required: false, reason: 'standard-change' };

  } catch (error) {
    console.error('Error checking PR requirements:', error.message);
    return { required: false, reason: 'error', error: error.message };
  }
}

/**
 * Classify file to domain (simplified)
 */
function classifyDomain(filePath) {
  if (/^client\/|^ui\/|\\.tsx$/.test(filePath)) return 'frontend';
  if (/^server\/|^services\/|api\//.test(filePath)) return 'backend';
  if (/^packages\//.test(filePath)) return 'platform';
  if (/platform-interface\//.test(filePath)) return 'interface-spine';
  if (/\\.repoos\/|scripts\/repoos\//.test(filePath)) return 'repoos-core';
  return 'general';
}

/**
 * Validate evidence bundle exists and is complete
 */
async function validateEvidenceBundle(prNumber) {
  console.log(`\n━━━ Validating Evidence Bundle for PR #${prNumber} ━━━\n`);

  const evidencePath = `evidence/pr-${prNumber}`;

  const validation = {
    bundle_exists: false,
    required_artifacts: {},
    optional_artifacts: {},
    overall_valid: false,
    confidence_score: 0,
    issues: []
  };

  try {
    // Check if evidence directory exists
    const stat = await fs.stat(evidencePath);
    if (!stat.isDirectory()) {
      validation.issues.push('Evidence path exists but is not a directory');
      return validation;
    }

    validation.bundle_exists = true;

    // Check required artifacts
    for (const artifact of EVIDENCE_SCHEMA.required_artifacts) {
      const artifactPath = path.join(evidencePath, artifact);
      try {
        await fs.access(artifactPath);
        const content = await fs.readFile(artifactPath, 'utf-8');

        // Validate content
        const artifactValidation = await validateArtifact(artifact, content);
        validation.required_artifacts[artifact] = artifactValidation;

        if (!artifactValidation.valid) {
          validation.issues.push(`Invalid ${artifact}: ${artifactValidation.reason}`);
        }

      } catch (error) {
        validation.required_artifacts[artifact] = { valid: false, reason: 'missing' };
        validation.issues.push(`Missing required artifact: ${artifact}`);
      }
    }

    // Check optional artifacts
    for (const artifact of EVIDENCE_SCHEMA.optional_artifacts) {
      const artifactPath = path.join(evidencePath, artifact);
      try {
        await fs.access(artifactPath);
        const content = await fs.readFile(artifactPath, 'utf-8');
        const artifactValidation = await validateArtifact(artifact, content);
        validation.optional_artifacts[artifact] = artifactValidation;
      } catch (error) {
        // Optional - not required
        validation.optional_artifacts[artifact] = { valid: false, reason: 'not-provided' };
      }
    }

    // Compute confidence score
    validation.confidence_score = computeEvidenceConfidence(validation);

    // Overall validation
    const allRequiredValid = Object.values(validation.required_artifacts).every(a => a.valid);
    validation.overall_valid = allRequiredValid && validation.confidence_score >= THRESHOLDS.minimum_confidence;

    // Display results
    console.log(`Bundle exists: ${validation.bundle_exists ? '✅' : '❌'}`);
    console.log(`\nRequired artifacts:`);
    for (const [artifact, status] of Object.entries(validation.required_artifacts)) {
      console.log(`  ${status.valid ? '✅' : '❌'} ${artifact}`);
    }

    console.log(`\nOptional artifacts:`);
    for (const [artifact, status] of Object.entries(validation.optional_artifacts)) {
      if (status.valid) {
        console.log(`  ✅ ${artifact}`);
      }
    }

    console.log(`\nConfidence score: ${(validation.confidence_score * 100).toFixed(0)}%`);
    console.log(`Overall valid: ${validation.overall_valid ? '✅' : '❌'}`);

    if (validation.issues.length > 0) {
      console.log(`\n⚠️  Issues:`);
      validation.issues.forEach(issue => console.log(`  - ${issue}`));
    }

  } catch (error) {
    validation.issues.push(`Error accessing evidence bundle: ${error.message}`);
  }

  return validation;
}

/**
 * Validate individual artifact
 */
async function validateArtifact(artifactName, content) {
  const validation = { valid: false, reason: '', confidence: 0 };

  try {
    if (artifactName.endsWith('.json')) {
      // JSON artifacts
      const data = JSON.parse(content);

      if (artifactName === 'impact-analysis.json') {
        validation.valid = validateImpactAnalysis(data);
        validation.confidence = data.confidence || 0;
        validation.reason = validation.valid ? 'valid' : 'incomplete-analysis';
      } else if (artifactName === 'dependency-diff.json') {
        validation.valid = validateDependencyDiff(data);
        validation.confidence = 0.8;
        validation.reason = validation.valid ? 'valid' : 'invalid-diff-format';
      } else if (artifactName === 'stability-simulation.json') {
        validation.valid = validateStabilitySimulation(data);
        validation.confidence = data.confidence || 0;
        validation.reason = validation.valid ? 'valid' : 'incomplete-simulation';
      } else {
        validation.valid = true;
        validation.confidence = 0.7;
        validation.reason = 'valid-json';
      }

    } else if (artifactName.endsWith('.md')) {
      // Markdown artifacts
      validation.valid = content.length > 100; // Minimum content length
      validation.confidence = 0.6;
      validation.reason = validation.valid ? 'valid-documentation' : 'insufficient-detail';
    } else {
      validation.valid = true;
      validation.confidence = 0.5;
      validation.reason = 'unknown-format';
    }

  } catch (error) {
    validation.valid = false;
    validation.reason = `validation-error: ${error.message}`;
  }

  return validation;
}

/**
 * Validate impact analysis structure
 */
function validateImpactAnalysis(data) {
  const required = ['domains_affected', 'architectural_impact', 'stability_impact', 'confidence'];
  return required.every(field => data.hasOwnProperty(field));
}

/**
 * Validate dependency diff structure
 */
function validateDependencyDiff(data) {
  return data.hasOwnProperty('added_dependencies') && data.hasOwnProperty('removed_dependencies');
}

/**
 * Validate stability simulation structure
 */
function validateStabilitySimulation(data) {
  const required = ['frontier_entropy', 'merge_throughput', 'stability_score', 'confidence'];
  return required.every(field => data.hasOwnProperty(field));
}

/**
 * Compute overall evidence confidence
 */
function computeEvidenceConfidence(validation) {
  let totalConfidence = 0;
  let count = 0;

  // Required artifacts contribute most
  for (const artifact of Object.values(validation.required_artifacts)) {
    if (artifact.valid && artifact.confidence) {
      totalConfidence += artifact.confidence * 1.0;
      count += 1.0;
    }
  }

  // Optional artifacts contribute less
  for (const artifact of Object.values(validation.optional_artifacts)) {
    if (artifact.valid && artifact.confidence) {
      totalConfidence += artifact.confidence * 0.5;
      count += 0.5;
    }
  }

  return count > 0 ? totalConfidence / count : 0;
}

/**
 * Generate governance decision
 */
async function generateGovernanceDecision(prNumber, requirement, validation) {
  console.log(`\n━━━ Governance Decision for PR #${prNumber} ━━━\n`);

  const decision = {
    pr_number: prNumber,
    timestamp: new Date().toISOString(),
    evidence_required: requirement.required,
    evidence_provided: validation.bundle_exists,
    evidence_valid: validation.overall_valid,
    confidence_score: validation.confidence_score,
    decision: 'PENDING',
    recommendation: '',
    required_actions: []
  };

  if (!requirement.required) {
    decision.decision = 'APPROVED';
    decision.recommendation = 'Standard change - no evidence required';
    console.log('✅ APPROVED (standard change)');
    return decision;
  }

  if (!validation.bundle_exists) {
    decision.decision = 'BLOCKED';
    decision.recommendation = 'Evidence bundle required but not provided';
    decision.required_actions.push('Create evidence bundle in evidence/pr-' + prNumber + '/');
    console.log('❌ BLOCKED (missing evidence bundle)');
    return decision;
  }

  if (!validation.overall_valid) {
    decision.decision = 'BLOCKED';
    decision.recommendation = 'Evidence bundle incomplete or invalid';
    decision.required_actions = validation.issues;
    console.log('❌ BLOCKED (invalid evidence)');
    return decision;
  }

  if (validation.confidence_score >= THRESHOLDS.auto_approve_confidence) {
    decision.decision = 'AUTO_APPROVED';
    decision.recommendation = 'High-confidence evidence - auto-approved';
    console.log('✅ AUTO-APPROVED (high confidence)');
  } else if (validation.confidence_score >= THRESHOLDS.minimum_confidence) {
    decision.decision = 'APPROVED_REVIEW';
    decision.recommendation = 'Evidence valid - recommend architecture review';
    console.log('✓ APPROVED (recommend review)');
  } else {
    decision.decision = 'BLOCKED';
    decision.recommendation = 'Evidence confidence below threshold';
    decision.required_actions.push('Improve evidence quality to meet minimum confidence threshold');
    console.log('❌ BLOCKED (low confidence)');
  }

  console.log(`\nConfidence: ${(decision.confidence_score * 100).toFixed(0)}%`);
  console.log(`Recommendation: ${decision.recommendation}`);

  if (decision.required_actions.length > 0) {
    console.log(`\nRequired actions:`);
    decision.required_actions.forEach(action => console.log(`  - ${action}`));
  }

  return decision;
}

/**
 * Save governance decision to ledger
 */
async function saveGovernanceDecision(decision) {
  const ledgerPath = '.repoos/governance-ledger';
  await fs.mkdir(ledgerPath, { recursive: true });

  const decisionPath = path.join(ledgerPath, `pr-${decision.pr_number}.json`);
  await fs.writeFile(decisionPath, JSON.stringify(decision, null, 2));

  console.log(`\n✓ Decision recorded: ${decisionPath}\n`);
}

/**
 * Generate evidence bundle template
 */
async function generateEvidenceTemplate(prNumber, reason) {
  console.log(`\n━━━ Generating Evidence Template for PR #${prNumber} ━━━\n`);

  const evidencePath = `evidence/pr-${prNumber}`;
  await fs.mkdir(evidencePath, { recursive: true });

  // Impact analysis template
  const impactTemplate = {
    pr_number: prNumber,
    reason,
    domains_affected: [],
    architectural_impact: {
      score: 0,
      description: "Describe architectural impact"
    },
    stability_impact: {
      frontier_entropy_delta: 0,
      router_accuracy_delta: 0,
      merge_throughput_delta: 0
    },
    confidence: 0,
    analysis_method: "automated|manual|hybrid",
    timestamp: new Date().toISOString()
  };

  await fs.writeFile(
    path.join(evidencePath, 'impact-analysis.json'),
    JSON.stringify(impactTemplate, null, 2)
  );

  // Dependency diff template
  const dependencyTemplate = {
    pr_number: prNumber,
    added_dependencies: [],
    removed_dependencies: [],
    dependency_count_delta: 0,
    cross_domain_dependencies_delta: 0,
    timestamp: new Date().toISOString()
  };

  await fs.writeFile(
    path.join(evidencePath, 'dependency-diff.json'),
    JSON.stringify(dependencyTemplate, null, 2)
  );

  // Stability simulation template
  const stabilityTemplate = {
    pr_number: prNumber,
    simulation_horizon_days: 90,
    frontier_entropy: {
      current: 0,
      projected: 0,
      delta: 0
    },
    merge_throughput: {
      current: 0,
      projected: 0,
      delta: 0
    },
    stability_score: 0,
    confidence: 0,
    methodology: "Describe simulation methodology",
    timestamp: new Date().toISOString()
  };

  await fs.writeFile(
    path.join(evidencePath, 'stability-simulation.json'),
    JSON.stringify(stabilityTemplate, null, 2)
  );

  // Architecture rationale template
  const rationaleTemplate = `# Architecture Rationale: PR #${prNumber}

## Change Summary
[Describe the architectural change]

## Motivation
[Explain why this change is necessary]

## Alternatives Considered
[List and evaluate alternatives]

## Impact Analysis
- **Domains Affected:** [List domains]
- **Architectural Impact:** [Describe impact]
- **Stability Impact:** [Describe stability implications]

## Migration Strategy
[Describe how to safely roll out this change]

## Rollback Plan
[Describe how to revert if needed]

## Evidence Summary
- Impact Analysis: [Confidence score]
- Dependency Diff: [Summary]
- Stability Simulation: [Results]

## Approval Requirements
- [ ] Architecture owners review
- [ ] Evidence validation passes
- [ ] Stability simulation acceptable

---
Generated: ${new Date().toISOString()}
`;

  await fs.writeFile(
    path.join(evidencePath, 'architecture-rationale.md'),
    rationaleTemplate
  );

  console.log(`✓ Evidence template created: ${evidencePath}/`);
  console.log(`  - impact-analysis.json`);
  console.log(`  - dependency-diff.json`);
  console.log(`  - stability-simulation.json`);
  console.log(`  - architecture-rationale.md`);
  console.log(`\nFill in the templates and commit to the PR branch.\n`);
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║        Evidence-Bound Governance Engine                       ║');
  console.log('║        Beyond FAANG: Machine-Verifiable Decisions             ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const prNumber = process.argv[2];

  if (!prNumber) {
    console.error('Usage: node evidence-governor.mjs <PR_NUMBER>');
    console.error('Example: node evidence-governor.mjs 19482');
    process.exit(1);
  }

  console.log(`Evaluating PR #${prNumber}...\n`);

  // Step 1: Check if evidence is required
  const requirement = await requiresEvidenceBundle(prNumber);

  console.log(`Evidence required: ${requirement.required ? '✅ YES' : '❌ NO'}`);
  console.log(`Reason: ${requirement.reason}\n`);

  if (requirement.required && process.argv.includes('--template')) {
    // Generate template mode
    await generateEvidenceTemplate(prNumber, requirement.reason);
    process.exit(0);
  }

  // Step 2: Validate evidence bundle (if required)
  let validation = { bundle_exists: false, overall_valid: false, confidence_score: 0 };

  if (requirement.required) {
    validation = await validateEvidenceBundle(prNumber);
  }

  // Step 3: Generate governance decision
  const decision = await generateGovernanceDecision(prNumber, requirement, validation);

  // Step 4: Save to ledger
  await saveGovernanceDecision(decision);

  // Exit with appropriate code
  if (decision.decision === 'BLOCKED') {
    console.log('Beyond FAANG Innovation:');
    console.log('  Evidence-bound governance ensures architecture decisions');
    console.log('  are machine-verifiable and deterministically reproducible.\n');
    process.exit(1);
  } else {
    console.log('Beyond FAANG Innovation:');
    console.log('  Evidence-driven architecture enables confident evolution.\n');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n❌ Evidence governance error:', error);
  process.exit(2);
});
