import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Re-using interfaces from collect script (ideally share types, but duplicating for script isolation)
interface ComplianceSignals {
  generated_at: string;
  maturity: any | 'MISSING';
  readiness: any | 'MISSING';
  policy: any | 'MISSING';
  dependencies: any | 'MISSING';
  promotion: any | 'MISSING';
  incident_drills: any | 'MISSING';
  field_mode: any | 'MISSING';
}

interface ComplianceDashboard {
  meta: {
    generated_at: string;
    checksum: string;
  };
  posture: {
    status: 'HEALTHY' | 'DEGRADED' | 'NON-COMPLIANT' | 'UNKNOWN';
    reasons: string[];
  };
  sections: {
    maturity_stage: string;
    controls_coverage: Array<{
      gate: string;
      required: boolean;
      outcome: string;
      last_run: string;
    }>;
    policy_status: {
      bundle_id: string;
      drift_status: string;
      pass_rate: string;
    };
    release_readiness: {
      shards_pass_rate: string;
      tag_rehearsal: string;
    };
    supply_chain: {
      deps_approved: string;
      changes_count: number;
    };
    incident_readiness: {
      last_drill: string;
      scenarios_status: string; // e.g., "2/2 PASS"
    };
    field_mode: string;
  };
}

const inputPath = process.env.INPUT_FILE || 'dist/compliance/signals.json';
const outputDir = process.env.OUTPUT_DIR || 'dist/compliance';

if (!fs.existsSync(inputPath)) {
  console.error(`Input file not found: ${inputPath}`);
  process.exit(1);
}

const signals: ComplianceSignals = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

// Rubric Logic
let status: 'HEALTHY' | 'DEGRADED' | 'NON-COMPLIANT' | 'UNKNOWN' = 'HEALTHY';
const reasons: string[] = [];

// Check Maturity vs Readiness
if (signals.maturity === 'MISSING') {
  status = 'UNKNOWN';
  reasons.push('Missing maturity signal');
} else {
  // Check Readiness Gates
  if (signals.readiness !== 'MISSING') {
      const gates = signals.readiness.gates || {};
      for (const [name, gate] of Object.entries(gates) as any) {
          if (gate.required && gate.outcome !== 'PASS') {
              status = 'NON-COMPLIANT';
              reasons.push(`Required gate failed: ${name}`);
          }
      }
  } else {
      reasons.push('Missing readiness signal');
      if (status !== 'NON-COMPLIANT') status = 'DEGRADED';
  }

  // Check Policy Drift
  if (signals.policy !== 'MISSING') {
      if (signals.policy.drift_status !== 'drift-free') {
          if (status !== 'NON-COMPLIANT') status = 'DEGRADED'; // Drift is degraded, unless policy failure enforcement makes it non-compliant
          reasons.push('Policy drift detected');
      }
  } else {
      reasons.push('Missing policy signal');
      if (status !== 'NON-COMPLIANT') status = 'DEGRADED';
  }

  // Check Promotion Guard
  if (signals.promotion !== 'MISSING') {
      if (signals.promotion.last_decision === 'DENY') {
          status = 'NON-COMPLIANT';
          reasons.push('Promotion guard denied');
          if (signals.promotion.deny_reasons) {
              reasons.push(...signals.promotion.deny_reasons);
          }
      }
  } else {
      // Missing promotion signal might be okay in early stages, but let's call it degraded
      if (status !== 'NON-COMPLIANT') status = 'DEGRADED';
      reasons.push('Missing promotion signal');
  }
}

// Build Sections

// Controls Coverage
const controls: any[] = [];
if (signals.readiness !== 'MISSING' && signals.readiness.gates) {
    for (const [name, gate] of Object.entries(signals.readiness.gates) as any) {
        controls.push({
            gate: name,
            required: gate.required,
            outcome: gate.outcome,
            last_run: gate.last_run_id
        });
    }
}

// Policy Status
let policyStatus = { bundle_id: 'N/A', drift_status: 'UNKNOWN', pass_rate: '0%' };
if (signals.policy !== 'MISSING') {
    policyStatus = {
        bundle_id: signals.policy.bundle_id,
        drift_status: signals.policy.drift_status,
        pass_rate: signals.policy.evidence_summary ? `${(signals.policy.evidence_summary.pass_rate * 100).toFixed(0)}%` : 'N/A'
    };
}

// Release Readiness
let releaseReadiness = { shards_pass_rate: 'N/A', tag_rehearsal: 'N/A' };
if (signals.readiness !== 'MISSING') {
    const shards = Object.values(signals.readiness.shards || {});
    const passed = shards.filter((s: any) => s.status === 'PASS').length;
    const total = shards.length;
    releaseReadiness.shards_pass_rate = total > 0 ? `${passed}/${total}` : 'N/A';
    releaseReadiness.tag_rehearsal = signals.readiness.tag_rehearsal ? signals.readiness.tag_rehearsal.status : 'N/A';
}

// Supply Chain
let supplyChain = { deps_approved: 'N/A', changes_count: 0 };
if (signals.dependencies !== 'MISSING') {
    supplyChain.deps_approved = signals.dependencies.approval_satisfied ? 'YES' : (signals.dependencies.approval_required ? 'NO' : 'N/A');
    supplyChain.changes_count = signals.dependencies.changes_count || 0;
}

// Incident Readiness
let incidentReadiness = { last_drill: 'N/A', scenarios_status: 'N/A' };
if (signals.incident_drills !== 'MISSING') {
    incidentReadiness.last_drill = signals.incident_drills.last_run_timestamp;
    const scenarios = Object.values(signals.incident_drills.scenarios || {});
    const passed = scenarios.filter((s: any) => s.outcome === 'PASS').length;
    incidentReadiness.scenarios_status = `${passed}/${scenarios.length} PASS`;
}

const dashboard: ComplianceDashboard = {
    meta: {
        generated_at: new Date().toISOString(),
        checksum: '' // Computed later
    },
    posture: {
        status,
        reasons: reasons.slice(0, 5) // Top 5
    },
    sections: {
        maturity_stage: signals.maturity !== 'MISSING' ? signals.maturity.stage : 'UNKNOWN',
        controls_coverage: controls,
        policy_status: policyStatus,
        release_readiness: releaseReadiness,
        supply_chain: supplyChain,
        incident_readiness: incidentReadiness,
        field_mode: signals.field_mode !== 'MISSING' ? (signals.field_mode.readiness_decision || 'UNKNOWN') : 'DISABLED'
    }
};

// Compute Checksum of the content (excluding meta.checksum itself)
const contentToHash = JSON.stringify(dashboard, null, 2); // approximate
dashboard.meta.checksum = crypto.createHash('sha256').update(contentToHash).digest('hex');

// Write JSON
fs.writeFileSync(path.join(outputDir, 'compliance.json'), JSON.stringify(dashboard, null, 2));

// Generate Markdown
const md = `# Continuous Compliance Dashboard

**Generated At:** ${dashboard.meta.generated_at}
**Status:** ${dashboard.posture.status}

${dashboard.posture.reasons.length > 0 ? '### Executive Attention Needed\n' + dashboard.posture.reasons.map(r => `- ${r}`).join('\n') : ''}

## Maturity & Posture
- **Stage:** ${dashboard.sections.maturity_stage}
- **Policy Drift:** ${dashboard.sections.policy_status.drift_status} (${dashboard.sections.policy_status.pass_rate} pass rate)
- **Field Mode:** ${dashboard.sections.field_mode}

## Controls Coverage
| Gate | Required | Outcome | Last Run |
|------|----------|---------|----------|
${dashboard.sections.controls_coverage.map(c => `| ${c.gate} | ${c.required ? 'YES' : 'NO'} | ${c.outcome} | ${c.last_run} |`).join('\n')}

## Release Readiness
- **Verification Shards:** ${dashboard.sections.release_readiness.shards_pass_rate}
- **Tag Rehearsal:** ${dashboard.sections.release_readiness.tag_rehearsal}

## Supply Chain
- **Dependencies Approved:** ${dashboard.sections.supply_chain.deps_approved}
- **Changes:** ${dashboard.sections.supply_chain.changes_count}

## Incident Readiness
- **Last Drill:** ${dashboard.sections.incident_readiness.last_drill}
- **Scenarios:** ${dashboard.sections.incident_readiness.scenarios_status}

---
*Checksum: ${dashboard.meta.checksum}*
`;

fs.writeFileSync(path.join(outputDir, 'compliance.md'), md);

// Generate HTML (Basic)
const html = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; max-width: 800px; margin: 2rem auto; }
  .status { padding: 1rem; border-radius: 4px; text-align: center; font-weight: bold; }
  .HEALTHY { background: #d4edda; color: #155724; }
  .DEGRADED { background: #fff3cd; color: #856404; }
  .NON-COMPLIANT { background: #f8d7da; color: #721c24; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background-color: #f2f2f2; }
</style>
</head>
<body>
<h1>Continuous Compliance Dashboard</h1>
<p>Generated: ${dashboard.meta.generated_at}</p>

<div class="status ${dashboard.posture.status}">
  ${dashboard.posture.status}
</div>

${dashboard.posture.reasons.length > 0 ?
  `<ul>${dashboard.posture.reasons.map(r => `<li>${r}</li>`).join('')}</ul>` : ''}

<h2>Controls</h2>
<table>
  <tr><th>Gate</th><th>Required</th><th>Outcome</th></tr>
  ${dashboard.sections.controls_coverage.map(c =>
    `<tr><td>${c.gate}</td><td>${c.required}</td><td>${c.outcome}</td></tr>`).join('')}
</table>

<p><em>Checksum: ${dashboard.meta.checksum}</em></p>
</body>
</html>
`;

fs.writeFileSync(path.join(outputDir, 'compliance.html'), html);
fs.writeFileSync(path.join(outputDir, 'checksums.sha256'), dashboard.meta.checksum);

console.log('Dashboard generated.');
