#!/usr/bin/env node
/**
 * Patch Market Prioritization Engine
 *
 * Treats patches as economic actors competing for integration.
 * Optimizes repository value per merge cycle instead of FIFO.
 *
 * Beyond FAANG Innovation: Market-based code integration
 *
 * Priority Score:
 *   priority = architectural_impact * 0.30
 *            + dependency_unblock * 0.25
 *            + stability_benefit * 0.20
 *            + domain_importance * 0.15
 *            - risk_penalty * 0.10
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Scoring weights for patch prioritization
 */
const WEIGHTS = {
  architectural_impact: 0.30,
  dependency_unblock: 0.25,
  stability_benefit: 0.20,
  domain_importance: 0.15,
  risk_penalty: 0.10
};

/**
 * Domain importance ranking
 */
const DOMAIN_IMPORTANCE = {
  'repoos-core': 1.0,
  'platform-runtime': 0.95,
  'security-platform': 0.95,
  'intelligence-platform': 0.90,
  'knowledge-graph': 0.90,
  'agent-orchestration': 0.85,
  'ml-platform': 0.85,
  'policy-governance': 0.85,
  'api-gateway': 0.80,
  'observability': 0.80,
  'data-platform': 0.75,
  'frontend-platform': 0.70,
  'default': 0.60
};

/**
 * Load domain map
 */
async function loadDomainMap() {
  try {
    const yaml = await import('js-yaml');
    const content = await fs.readFile('.repoos/domain-map.yml', 'utf-8');
    return yaml.default.load(content);
  } catch (error) {
    return null;
  }
}

/**
 * Classify file to domain
 */
function classifyFileToDomain(filePath, domainMap) {
  if (!domainMap || !domainMap.domains) {
    return 'general';
  }

  for (const [domainName, domain] of Object.entries(domainMap.domains)) {
    if (domain.subsystem_patterns) {
      for (const pattern of domain.subsystem_patterns) {
        const regexPattern = pattern
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\//g, '\\/');

        if (new RegExp(regexPattern).test(filePath)) {
          return domainName;
        }
      }
    }
  }

  return 'general';
}

/**
 * Compute architectural impact score
 */
function computeArchitecturalImpact(pr, domainMap) {
  const files = pr.files || [];

  if (files.length === 0) return 0.3;

  // Check if PR touches core infrastructure
  const touchesCore = files.some(f =>
    /\.repoos\/|platform-interface\/|scripts\/repoos\//.test(f.path)
  );

  if (touchesCore) return 0.95;

  // Check if PR modifies interfaces
  const touchesInterface = files.some(f =>
    /platform-interface\/|\.contract\.ts$|\.schema\.json$/.test(f.path)
  );

  if (touchesInterface) return 0.85;

  // Check if PR is architectural refactor
  const isRefactor = pr.title && (
    /refactor|restructure|consolidate/i.test(pr.title) ||
    /architecture|design/i.test(pr.title)
  );

  if (isRefactor) return 0.80;

  // Check number of files - larger changes have more impact
  const fileScore = Math.min(files.length / 20, 1.0);

  return 0.3 + (fileScore * 0.4);
}

/**
 * Compute dependency unblock score
 */
function computeDependencyUnblock(pr) {
  const title = (pr.title || '').toLowerCase();
  const labels = pr.labels || [];

  // Check if PR unblocks others
  if (labels.some(l => l.name === 'unblocks' || l.name === 'dependency')) {
    return 0.90;
  }

  // Check if PR is infrastructure/platform work
  if (/infrastructure|platform|core|foundation/.test(title)) {
    return 0.80;
  }

  // Check if PR fixes bugs that might block others
  if (labels.some(l => l.name === 'bug') || /fix|bug/.test(title)) {
    return 0.70;
  }

  // Check if PR adds new capability
  if (/feat|feature|new/.test(title)) {
    return 0.60;
  }

  return 0.40;
}

/**
 * Compute stability benefit score
 */
function computeStabilityBenefit(pr) {
  const title = (pr.title || '').toLowerCase();
  const labels = pr.labels || [];

  // Constitutional/governance improvements
  if (/constitution|governance|homeostasis|stability/.test(title)) {
    return 0.95;
  }

  // Consolidation/cleanup
  if (/consolidate|cleanup|simplify|reduce/.test(title)) {
    return 0.85;
  }

  // Test improvements
  if (labels.some(l => l.name === 'tests') || /test|coverage/.test(title)) {
    return 0.75;
  }

  // Security improvements
  if (labels.some(l => l.name === 'security') || /security|vulnerability/.test(title)) {
    return 0.85;
  }

  // Performance improvements
  if (/performance|optimize|improve/.test(title)) {
    return 0.70;
  }

  // Documentation
  if (labels.some(l => l.name === 'documentation') || /docs|documentation/.test(title)) {
    return 0.50;
  }

  return 0.40;
}

/**
 * Compute domain importance score
 */
function computeDomainImportance(pr, domainMap) {
  const files = pr.files || [];

  if (files.length === 0) return 0.60;

  const domains = new Set();
  for (const file of files) {
    const domain = classifyFileToDomain(file.path, domainMap);
    domains.add(domain);
  }

  // Get max importance of touched domains
  let maxImportance = 0;
  for (const domain of domains) {
    const importance = DOMAIN_IMPORTANCE[domain] || DOMAIN_IMPORTANCE.default;
    maxImportance = Math.max(maxImportance, importance);
  }

  return maxImportance;
}

/**
 * Compute risk penalty
 */
function computeRiskPenalty(pr) {
  const files = pr.files || [];
  const title = (pr.title || '').toLowerCase();

  let risk = 0;

  // Large PRs are riskier
  if (files.length > 50) risk += 0.40;
  else if (files.length > 20) risk += 0.25;
  else if (files.length > 10) risk += 0.10;

  // Cross-domain changes are riskier
  const domainMap = null; // Would load if needed
  const domains = new Set(files.map(f => classifyFileToDomain(f.path, domainMap)));
  if (domains.size > 2) risk += 0.30;
  else if (domains.size > 1) risk += 0.15;

  // Breaking changes are riskier
  if (/breaking|remove|delete|deprecate/.test(title)) {
    risk += 0.35;
  }

  // Experimental features are riskier
  if (/experimental|wip|draft/.test(title) || pr.draft) {
    risk += 0.25;
  }

  return Math.min(risk, 1.0);
}

/**
 * Compute overall priority score for a PR
 */
async function computePriorityScore(pr, domainMap) {
  const scores = {
    architectural_impact: computeArchitecturalImpact(pr, domainMap),
    dependency_unblock: computeDependencyUnblock(pr),
    stability_benefit: computeStabilityBenefit(pr),
    domain_importance: computeDomainImportance(pr, domainMap),
    risk_penalty: computeRiskPenalty(pr)
  };

  const priority =
    scores.architectural_impact * WEIGHTS.architectural_impact +
    scores.dependency_unblock * WEIGHTS.dependency_unblock +
    scores.stability_benefit * WEIGHTS.stability_benefit +
    scores.domain_importance * WEIGHTS.domain_importance -
    scores.risk_penalty * WEIGHTS.risk_penalty;

  return {
    priority: Math.max(0, Math.min(1, priority)),
    scores,
    recommendation: priority > 0.75 ? 'HIGH' :
                    priority > 0.60 ? 'MEDIUM' :
                    priority > 0.45 ? 'NORMAL' : 'LOW'
  };
}

/**
 * Prioritize merge queue
 */
async function prioritizeMergeQueue(limit = 50) {
  console.log('\n━━━ Patch Market Analysis ━━━\n');
  console.log('Analyzing open PRs for optimal merge order...\n');

  const domainMap = await loadDomainMap();

  try {
    // Get open PRs
    const prsJson = execSync(
      `gh pr list --state open --limit ${limit} --json number,title,labels,files,draft,createdAt`,
      { encoding: 'utf-8' }
    );

    const prs = JSON.parse(prsJson);

    console.log(`Found ${prs.length} open PRs\n`);

    // Compute priority scores
    const scoredPrs = [];
    for (const pr of prs) {
      const score = await computePriorityScore(pr, domainMap);
      scoredPrs.push({
        number: pr.number,
        title: pr.title,
        createdAt: pr.createdAt,
        ...score
      });
    }

    // Sort by priority (highest first)
    scoredPrs.sort((a, b) => b.priority - a.priority);

    // Display results
    console.log('━━━ Priority Queue (Optimal Merge Order) ━━━\n');

    const high = scoredPrs.filter(p => p.recommendation === 'HIGH');
    const medium = scoredPrs.filter(p => p.recommendation === 'MEDIUM');
    const normal = scoredPrs.filter(p => p.recommendation === 'NORMAL');
    const low = scoredPrs.filter(p => p.recommendation === 'LOW');

    console.log(`🔴 HIGH Priority (${high.length}): Merge first`);
    for (const pr of high.slice(0, 10)) {
      console.log(`  #${pr.number} [${(pr.priority * 100).toFixed(0)}%] ${pr.title}`);
    }

    console.log(`\n🟡 MEDIUM Priority (${medium.length}): Merge after high`);
    for (const pr of medium.slice(0, 5)) {
      console.log(`  #${pr.number} [${(pr.priority * 100).toFixed(0)}%] ${pr.title}`);
    }

    console.log(`\n🟢 NORMAL Priority (${normal.length}): Standard queue`);
    console.log(`\n⚪ LOW Priority (${low.length}): Defer if queue builds\n`);

    // Save prioritized queue
    const report = {
      timestamp: new Date().toISOString(),
      total_prs: prs.length,
      queue: scoredPrs,
      summary: {
        high: high.length,
        medium: medium.length,
        normal: normal.length,
        low: low.length
      },
      weights: WEIGHTS
    };

    const reportPath = `.repoos/patch-market/queue-${new Date().toISOString().split('T')[0]}.json`;
    await fs.mkdir('.repoos/patch-market', { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`✓ Priority queue saved: ${reportPath}\n`);

    // Recommendations
    console.log('━━━ Merge Strategy Recommendations ━━━\n');

    if (high.length > 0) {
      console.log(`1. Focus on ${high.length} high-priority PRs first`);
      console.log(`   These provide maximum architectural value`);
    }

    if (scoredPrs.length > 30) {
      console.log(`\n2. Queue depth: ${scoredPrs.length} PRs`);
      console.log(`   Consider activating Patch Surface Limiting (PSL)`);
    }

    const avgPriority = scoredPrs.reduce((sum, p) => sum + p.priority, 0) / scoredPrs.length;
    console.log(`\n3. Average priority: ${(avgPriority * 100).toFixed(0)}%`);

    if (avgPriority < 0.50) {
      console.log(`   ⚠️  Low average priority - quality gate working well`);
    }

    console.log('\nBeyond FAANG Innovation:');
    console.log('  Market-based prioritization optimizes repository value');
    console.log('  per merge cycle instead of FIFO integration.\n');

    return report;

  } catch (error) {
    console.error('Error prioritizing merge queue:', error.message);
    return null;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║        Patch Market Prioritization Engine                     ║');
  console.log('║        Beyond FAANG: Market-Based Integration                 ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const limit = process.env.PR_LIMIT ? parseInt(process.env.PR_LIMIT) : 50;

  await prioritizeMergeQueue(limit);

  process.exit(0);
}

main().catch(error => {
  console.error('\n❌ Patch market error:', error);
  process.exit(1);
});
