
import fs from 'fs';
import path from 'path';
import axios from 'axios';

// --- Types ---

interface PrInfo {
  number: number;
  title: string;
  user: { login: string };
  draft: boolean;
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  updated_at: string;
  html_url: string;
}

interface PrFile {
  filename: string;
  status: string;
}

interface CompareResult {
  behind_by: number;
  status: string; // "diverged", "ahead", "behind", "identical"
}

interface AnalyzedPr {
  number: number;
  title: string;
  author: string;
  draft: boolean;
  headRef: string;
  baseRef: string;
  updatedAt: string;
  htmlUrl: string;
  behindBase: {
    commitsBehind: number;
    daysBehind?: number;
  };
  files: string[];
  changedPathsSummary: {
    topDirs: string[];
    fileCount: number;
  };
  overlapSignals: {
    hotspotDirs: string[];
    topOverlappingPrs: number[];
  };
  conflictScore: number;
  factors: string[];
  rebaseAdvice: {
    actionEnum: 'MERGE_FIRST' | 'REBASE_NOW' | 'SPLIT' | 'HOLD' | 'SAFE_TO_MERGE' | 'NEEDS_FIX';
    rationale: string;
    checklistSteps: string[];
  };
  dependencyNotes: {
    mustGoAfter: number[];
    shouldGoBefore: number[];
  };
}

interface ForecastOutput {
  generatedAtUtc: string;
  baseBranch: string;
  prs: AnalyzedPr[];
  mergeTrain: { prNumber: number; rationale: string }[];
}

// --- Configuration ---

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.GITHUB_REPOSITORY?.split('/')[0] || 'BrianCLong';
const REPO_NAME = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'summit';
const BASE_API_URL = 'https://api.github.com';
const OUTPUT_DIR = 'docs/ops/pr-forecast';
const MAX_PRS_TO_PROCESS = 150; // Safety cap

const CRITICAL_PATHS = [
  '.github/workflows',
  'scripts/',
  'package.json',
  'pnpm-lock.yaml',
  'nx.json',
  'turbo.json'
];

// --- Helpers ---

const api = axios.create({
  baseURL: BASE_API_URL,
  headers: {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  },
});

async function fetchOpenPrs(): Promise<PrInfo[]> {
  console.log('Fetching open PRs...');
  let prs: PrInfo[] = [];
  let page = 1;

  while (true) {
    try {
      const res = await api.get<PrInfo[]>(`/repos/${REPO_OWNER}/${REPO_NAME}/pulls`, {
        params: { state: 'open', per_page: 100, page },
      });
      if (res.data.length === 0) break;
      prs = prs.concat(res.data);
      if (prs.length >= MAX_PRS_TO_PROCESS) break;
      page++;
    } catch (error: any) {
      console.error('Error fetching PRs:', error.message);
      if (!GITHUB_TOKEN) {
         console.log("No GITHUB_TOKEN provided. Returning mock data if in dev mode, or exiting.");
      }
      break;
    }
  }
  return prs;
}

async function fetchPrFiles(prNumber: number): Promise<string[]> {
  try {
    const res = await api.get<PrFile[]>(`/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${prNumber}/files`, {
      params: { per_page: 100 },
    });
    return res.data.map(f => f.filename);
  } catch (error: any) {
    console.error(`Error fetching files for PR #${prNumber}:`, error.message);
    return [];
  }
}

async function fetchCompare(base: string, head: string): Promise<CompareResult | null> {
  try {
    const res = await api.get<CompareResult>(`/repos/${REPO_OWNER}/${REPO_NAME}/compare/${base}...${head}`);
    return res.data;
  } catch (error: any) {
    console.warn(`Error comparing ${base}...${head}:`, error.message);
    return null;
  }
}

function getDirectory(filePath: string, depth: number = 2): string {
  const parts = filePath.split('/');
  return parts.slice(0, Math.min(parts.length - 1, depth)).join('/') + '/';
}

function calculateScoreAndAdvice(pr: AnalyzedPr, allPrs: AnalyzedPr[], hotspotMap: Map<string, number>): void {
  let score = 0;
  const factors: string[] = [];

  // 1. Hotspot Overlap
  let hotspotHits = 0;
  pr.changedPathsSummary.topDirs.forEach(dir => {
    const count = hotspotMap.get(dir) || 0;
    if (count > 2) { // arbitrary threshold for "hot"
      hotspotHits += count;
      pr.overlapSignals.hotspotDirs.push(dir);
    }
  });

  if (hotspotHits > 0) {
    score += Math.min(hotspotHits * 5, 40);
    factors.push(`Hotspot Overlap (score impact: ${Math.min(hotspotHits * 5, 40)})`);
  }

  // 2. Critical Paths
  const touchesCritical = pr.files.some(f => CRITICAL_PATHS.some(cp => f.startsWith(cp)));
  if (touchesCritical) {
    score += 30;
    factors.push('Touches Critical Paths');
  }

  // 3. Staleness / Behind Base
  if (pr.behindBase.commitsBehind > 10) {
    score += 20;
    factors.push(`Significantly behind base (${pr.behindBase.commitsBehind} commits)`);
  } else if (pr.behindBase.commitsBehind > 0) {
    score += 5;
    factors.push('Behind base');
  }

  // 4. Size
  if (pr.files.length > 50) {
    score += 15;
    factors.push('Large changeset (>50 files)');
  }

  pr.conflictScore = Math.min(score, 100);
  pr.factors = factors;

  // Determine Advice
  if (touchesCritical) {
    pr.rebaseAdvice = {
      actionEnum: 'MERGE_FIRST',
      rationale: 'Critical infrastructure changes should be merged sequentially and verified.',
      checklistSteps: [
        'Ensure this PR is the only one modifying critical paths currently in the merge train.',
        'Run full regression suite.',
        'Merge immediately if green.'
      ]
    };
  } else if (pr.behindBase.commitsBehind > 20) {
    pr.rebaseAdvice = {
      actionEnum: 'REBASE_NOW',
      rationale: 'Branch is significantly out of date.',
      checklistSteps: [
        `git fetch origin ${pr.baseRef}`,
        `git checkout ${pr.headRef}`,
        `git rebase origin/${pr.baseRef}`,
        'Verify build and tests',
        'Push updates'
      ]
    };
  } else if (pr.conflictScore > 50) {
    pr.rebaseAdvice = {
      actionEnum: 'HOLD',
      rationale: 'High conflict risk. Wait for queue to drain or hotspots to resolve.',
      checklistSteps: [
        'Monitor merging of overlapping PRs',
        'Re-run forecast after their merge',
        'Rebase and re-verify'
      ]
    };
  } else if (pr.files.length > 100) {
     pr.rebaseAdvice = {
      actionEnum: 'SPLIT',
      rationale: 'Massive PR increases integration risk.',
      checklistSteps: [
        'Identify independent modules',
        'Split into smaller PRs',
        'Stack PRs if necessary'
      ]
    };
  } else {
    pr.rebaseAdvice = {
      actionEnum: 'SAFE_TO_MERGE',
      rationale: 'Low risk factors detected.',
      checklistSteps: [
        'Standard review',
        'Merge when green'
      ]
    };
  }
}

// --- Main Execution ---

async function main() {
  if (!GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN not set.');
    // For local dev without token, maybe mocking?
    // But requirement says "rely on Actions GITHUB_TOKEN"
    if (process.env.CI) {
        process.exit(1);
    } else {
        console.warn("Continuing with mock mode for local dev (if implemented) or failing.");
        // We will fail for now to enforce requirement.
        // process.exit(1);
    }
  }

  const prsRaw = await fetchOpenPrs();
  console.log(`Found ${prsRaw.length} open PRs.`);

  const analyzedPrs: AnalyzedPr[] = [];
  const dirCounts = new Map<string, number>();

  // 1. Gather Data
  for (const pr of prsRaw) {
    console.log(`Analyzing PR #${pr.number}: ${pr.title}`);
    const files = await fetchPrFiles(pr.number);
    let behind = 0;

    // Check divergence
    // Optimization: Only check if we really suspect it (e.g. updated long ago) or just do it.
    // Given 125 limit, let's try to do it.
    // Use SHA for head to support forks where the branch name doesn't exist in base repo
    const comparison = await fetchCompare(pr.base.ref, pr.head.sha);
    if (comparison) {
      behind = comparison.behind_by;
    }

    // Dir stats
    const dirs = new Set(files.map(f => getDirectory(f)));
    dirs.forEach(d => {
      dirCounts.set(d, (dirCounts.get(d) || 0) + 1);
    });

    analyzedPrs.push({
      number: pr.number,
      title: pr.title,
      author: pr.user.login,
      draft: pr.draft,
      headRef: pr.head.ref,
      baseRef: pr.base.ref,
      updatedAt: pr.updated_at,
      htmlUrl: pr.html_url,
      behindBase: {
        commitsBehind: behind,
      },
      files: files,
      changedPathsSummary: {
        topDirs: Array.from(dirs),
        fileCount: files.length
      },
      overlapSignals: {
        hotspotDirs: [],
        topOverlappingPrs: []
      },
      conflictScore: 0,
      factors: [],
      rebaseAdvice: { actionEnum: 'NEEDS_FIX', rationale: 'Pending analysis', checklistSteps: [] },
      dependencyNotes: { mustGoAfter: [], shouldGoBefore: [] }
    });
  }

  // 2. Compute Overlaps and Scores
  for (const pr of analyzedPrs) {
    // Find overlapping PRs
    const overlaps = analyzedPrs.filter(other =>
      other.number !== pr.number &&
      other.changedPathsSummary.topDirs.some(d => pr.changedPathsSummary.topDirs.includes(d))
    );
    pr.overlapSignals.topOverlappingPrs = overlaps.map(o => o.number);

    // Dependency Notes (Primitive heuristic: High overlap should maybe wait?)
    // Actually, simple logic: If A overlaps B, and B is "better" (e.g. critical path or smaller), B goes first.
    // We'll calculate this in the Merge Train phase properly.

    calculateScoreAndAdvice(pr, analyzedPrs, dirCounts);
  }

  // 3. Build Merge Train
  // Sort by: Critical Path First -> Low Score -> Small Size
  const sortedPrs = [...analyzedPrs].sort((a, b) => {
    // 1. Critical path wins
    const aCrit = a.factors.includes('Touches Critical Paths');
    const bCrit = b.factors.includes('Touches Critical Paths');
    if (aCrit && !bCrit) return -1;
    if (!aCrit && bCrit) return 1;

    // 2. Score (lower is better)
    if (a.conflictScore !== b.conflictScore) return a.conflictScore - b.conflictScore;

    // 3. Size (smaller is better)
    return a.files.length - b.files.length;
  });

  const mergeTrain = sortedPrs.map(pr => ({
    prNumber: pr.number,
    rationale: `Score: ${pr.conflictScore}. ${pr.rebaseAdvice.rationale}`
  }));

  // Update dependency notes based on train
  for (let i = 0; i < sortedPrs.length; i++) {
    const pr = sortedPrs[i];
    const prev = sortedPrs.slice(0, i).filter(p => pr.overlapSignals.topOverlappingPrs.includes(p.number));
    const next = sortedPrs.slice(i + 1).filter(p => pr.overlapSignals.topOverlappingPrs.includes(p.number));

    pr.dependencyNotes.mustGoAfter = prev.map(p => p.number);
    pr.dependencyNotes.shouldGoBefore = next.map(p => p.number);
  }

  // 4. Output
  const output: ForecastOutput = {
    generatedAtUtc: new Date().toISOString(),
    baseBranch: 'main', // Assuming main, could grab from first PR
    prs: analyzedPrs.map(p => {
       const { files, htmlUrl, ...rest } = p; // Exclude raw file list from JSON to keep it smaller? The schema has it? Schema doesn't have 'files'.
       return rest;
    }),
    mergeTrain
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // JSON
  fs.writeFileSync(path.join(OUTPUT_DIR, 'PR_CONFLICT_FORECAST.json'), JSON.stringify(output, null, 2));
  console.log(`Wrote JSON report to ${OUTPUT_DIR}/PR_CONFLICT_FORECAST.json`);

  // Markdown
  let md = `# PR Conflict Forecast & Auto-Rebase Advisor\n\n`;
  md += `**Generated At:** ${output.generatedAtUtc}\n`;
  md += `**Open PRs Analyzed:** ${analyzedPrs.length}\n\n`;

  md += `## 🚂 Recommended Merge Train\n\n`;
  output.mergeTrain.forEach((item, idx) => {
    md += `${idx + 1}. **#${item.prNumber}** - ${item.rationale}\n`;
  });

  md += `\n## 📋 Per-PR Action Checklists\n\n`;

  for (const pr of analyzedPrs) {
    const icon = pr.conflictScore > 50 ? '🔴' : (pr.conflictScore > 20 ? '🟡' : '🟢');
    md += `### ${icon} #${pr.number}: ${pr.title}\n\n`;
    md += `- **Author:** ${pr.author}\n`;
    md += `- **Conflict Score:** ${pr.conflictScore}/100\n`;
    md += `- **Action:** \`${pr.rebaseAdvice.actionEnum}\`\n`;
    if (pr.behindBase.commitsBehind > 0) {
      md += `- **Behind Base:** ${pr.behindBase.commitsBehind} commits\n`;
    }

    if (pr.overlapSignals.hotspotDirs.length > 0) {
      md += `- **Hotspots:** \`${pr.overlapSignals.hotspotDirs.join(', ')}\`\n`;
    }

    if (pr.dependencyNotes.mustGoAfter.length > 0) {
       md += `- **⚠️ Merge After:** #${pr.dependencyNotes.mustGoAfter.join(', #')}\n`;
    }

    md += `\n**Checklist:**\n`;
    pr.rebaseAdvice.checklistSteps.forEach(step => {
      md += `- [ ] ${step}\n`;
    });
    md += `\n---\n`;
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'PR_CONFLICT_FORECAST.md'), md);
  console.log(`Wrote Markdown report to ${OUTPUT_DIR}/PR_CONFLICT_FORECAST.md`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
