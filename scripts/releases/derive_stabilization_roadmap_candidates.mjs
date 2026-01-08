import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const REPO_ROOT = process.cwd();
const RETROSPECTIVE_REPORT_PATH = path.join(REPO_ROOT, 'artifacts/stabilization/retrospective-report.json');
const POLICY_PATH = path.join(REPO_ROOT, 'release-policy.yml');
const OUTPUT_DIR = path.join(REPO_ROOT, 'artifacts/stabilization');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'derived-candidates.json');

function deriveCandidates(report, policy) {
  const candidates = {};
  const { thresholds, max_candidates } = policy.stabilization_roadmap_handoff;

  const unissued = report.weekly_reports.filter(r => r.blocked_unissued_p0 > 0).length;
  if (unissued >= 1) {
    candidates['issuance-hygiene'] = {
      score: unissued * 10,
      weeks: unissued,
      reason: `${unissued} week(s) had unissued P0s.`
    };
  }

  const compliance = report.weekly_reports.filter(r => r.evidence_compliance < thresholds.evidence_compliance_min).length;
  if (compliance >= 2) {
    candidates['evidence-compliance'] = {
      score: compliance * 10,
      weeks: compliance,
      reason: `${compliance} week(s) were below evidence compliance threshold.`
    };
  }

  const overdue = report.weekly_reports.filter(r => r.overdue_load_p0 > 0).length;
  if (overdue >= thresholds.recurring_overdue_weeks) {
    candidates['p0-sla-adherence'] = {
        score: overdue * 10,
        weeks: overdue,
        reason: `${overdue} week(s) had overdue P0s.`
    };
  }

  const highRiskWeeks = report.weekly_reports.filter(r => r.risk_index_avg >= thresholds.min_risk_index_avg);
  if (highRiskWeeks.length > 0) {
    const avgRisk = highRiskWeeks.reduce((sum, r) => sum + r.risk_index_avg, 0) / highRiskWeeks.length;
    candidates['systemic-risk-reduction'] = {
        score: avgRisk,
        weeks: highRiskWeeks.length,
        reason: `${highRiskWeeks.length} week(s) had an average risk index >= ${thresholds.min_risk_index_avg}.`
    };
  }

  const ciAtRisk = report.weekly_reports.filter(r => r.ci_okr_at_risk).length;
  if (ciAtRisk >= thresholds.recurring_ci_at_risk_weeks) {
      candidates['ci-gate-stability'] = {
          score: ciAtRisk * 5,
          weeks: ciAtRisk,
          reason: `${ciAtRisk} week(s) had CI OKR at risk.`
      };
  }


  const sortedCandidates = Object.entries(candidates)
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, max_candidates);

  return Object.fromEntries(sortedCandidates);
}

function main() {
  const report = JSON.parse(fs.readFileSync(RETROSPECTIVE_REPORT_PATH, 'utf8'));
  const policy = yaml.load(fs.readFileSync(POLICY_PATH, 'utf8'));

  if (!policy.stabilization_roadmap_handoff || !policy.stabilization_roadmap_handoff.enabled) {
    console.log('Stabilization roadmap handoff is disabled in the policy.');
    return;
  }

  const candidates = deriveCandidates(report, policy);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(candidates, null, 2));

  console.log(`Successfully derived ${Object.keys(candidates).length} roadmap candidates.`);
  console.log(`Output written to ${OUTPUT_PATH}`);
}

main();
