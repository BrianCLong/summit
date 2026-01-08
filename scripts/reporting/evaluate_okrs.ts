import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface OkrStatus {
  metric_id: string;
  current_value: any;
  target: number | boolean;
  status: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK' | 'UNKNOWN';
  owner: string;
}

const evaluateOkrs = () => {
  try {
    const policyPath = 'ci/governance-okrs.yml';
    const policy = yaml.load(fs.readFileSync(policyPath, 'utf8')) as any;
    const quarterId = policy.quarter_id;
    const signalsPath = `dist/okrs/${quarterId}/signals.json`;

    if (!fs.existsSync(signalsPath)) {
      throw new Error(`Signals file not found: ${signalsPath}`);
    }

    const signals = JSON.parse(fs.readFileSync(signalsPath, 'utf8'));
    const results: any[] = [];
    const ownership = policy.ownership || {};

    let overallStatus = 'ON_TRACK';

    policy.objectives.forEach((obj: any) => {
      const objResults: any[] = [];
      obj.key_results.forEach((kr: any) => {
        const signal = signals[kr.metric_id];
        let status = 'UNKNOWN';
        let currentValue = signal ? signal.value : null;

        if (currentValue !== null && currentValue !== undefined) {
          const target = kr.target;
          let met = false;
          switch (kr.direction) {
            case '>=': met = currentValue >= target; break;
            case '<=': met = currentValue <= target; break;
            case '==': met = currentValue === target; break;
            default: met = false;
          }
          status = met ? 'ON_TRACK' : 'OFF_TRACK';
        } else {
            status = policy.tolerances?.missing_data_penalty || 'AT_RISK';
        }

        if (status === 'OFF_TRACK') overallStatus = 'OFF_TRACK'; // Simplistic rollup

        const result = {
          metric_id: kr.metric_id,
          title: obj.title, // associating with objective
          current_value: currentValue,
          target: kr.target,
          direction: kr.direction,
          status,
          owner: ownership[kr.metric_id] || 'Unassigned',
          hard_fail: kr.hard_fail || false
        };
        objResults.push(result);
        results.push(result);
      });
      obj.results = objResults;
    });

    const outputDir = `dist/okrs/${quarterId}`;
    const statusJsonPath = path.join(outputDir, 'okr-status.json');
    const statusMdPath = path.join(outputDir, 'okr-status.md');

    const outputJson = {
      quarter_id: quarterId,
      generated_at: new Date().toISOString(),
      overall_status: overallStatus,
      results
    };

    fs.writeFileSync(statusJsonPath, JSON.stringify(outputJson, null, 2));

    // Generate MD
    let mdContent = `# Governance OKRs Status (${quarterId})\n\n`;
    mdContent += `**Generated At:** ${outputJson.generated_at}\n`;
    mdContent += `**Overall Status:** ${overallStatus}\n\n`;
    mdContent += `| Metric | Target | Current | Status | Owner |\n`;
    mdContent += `|---|---|---|---|---|\n`;

    results.forEach(r => {
      const icon = r.status === 'ON_TRACK' ? '🟢' : (r.status === 'OFF_TRACK' ? '🔴' : '🟡');
      mdContent += `| ${r.metric_id} | ${r.direction} ${r.target} | ${r.current_value} | ${icon} ${r.status} | ${r.owner} |\n`;
    });

    fs.writeFileSync(statusMdPath, mdContent);
    console.log(`Evaluation complete. Artifacts in ${outputDir}`);

  } catch (e) {
    console.error('Evaluation failed:', e);
    process.exit(1);
  }
};

evaluateOkrs();
