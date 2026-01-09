import { readFileSync } from 'node:fs';

export function normalizeLabel(label) {
  return label.trim().toLowerCase();
}

export function loadPolicy(policyPath) {
  const raw = readFileSync(policyPath, 'utf8');
  const policy = JSON.parse(raw);
  return {
    highlightLabels: (policy.highlight_labels || []).map(normalizeLabel),
    breakingLabels: (policy.breaking_labels || []).map(normalizeLabel),
    sections: Object.fromEntries(
      Object.entries(policy.sections || {}).map(([section, labels]) => [
        section,
        labels.map(normalizeLabel),
      ]),
    ),
  };
}

export function normalizePullRequest(pr) {
  const labels = (pr.labels || []).map(label => {
    if (typeof label === 'string') return label;
    if (label && typeof label.name === 'string') return label.name;
    return '';
  });
  return {
    number: pr.number,
    title: pr.title,
    url: pr.url,
    mergedAt: pr.mergedAt || pr.merged_at,
    body: pr.body || '',
    labels,
  };
}

export function sortPullRequests(pullRequests) {
  return [...pullRequests].sort((a, b) => a.number - b.number);
}

export function groupPullRequests(pullRequests, policy) {
  const groups = Object.fromEntries(
    Object.keys(policy.sections).map(section => [section, []]),
  );

  for (const pr of pullRequests) {
    const prLabels = pr.labels.map(normalizeLabel);
    let assigned = false;

    for (const [section, labels] of Object.entries(policy.sections)) {
      if (labels.some(label => prLabels.includes(label))) {
        groups[section].push(pr);
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      groups.Changed.push(pr);
    }
  }

  return groups;
}

export function extractBreakingChanges(pullRequests, policy) {
  const breakingLabels = new Set(policy.breakingLabels);
  return pullRequests.filter(pr => {
    const prLabels = pr.labels.map(normalizeLabel);
    const hasBreakingLabel = prLabels.some(label => breakingLabels.has(label));
    const titleBreaking = pr.title.toLowerCase().includes('breaking');
    const bodyBreaking = pr.body.toLowerCase().includes('breaking change');
    return hasBreakingLabel || titleBreaking || bodyBreaking;
  });
}

export function selectHighlights(pullRequests, policy) {
  const highlightLabels = new Set(policy.highlightLabels);
  return pullRequests.filter(pr =>
    pr.labels.map(normalizeLabel).some(label => highlightLabels.has(label)),
  );
}

export function extractIssueReferences(pullRequests) {
  const issues = new Set();
  const issueRegex = /(close[sd]?|fix(e[sd])?|resolve[sd]?)\s+#(\d+)/gi;

  for (const pr of pullRequests) {
    let match;
    while ((match = issueRegex.exec(pr.body)) !== null) {
      issues.add(Number(match[3]));
    }
  }

  return Array.from(issues).sort((a, b) => a - b);
}

export function formatPullRequest(pr) {
  return `- #${pr.number} ${pr.title} (${pr.url})`;
}

export function buildReleaseNotesMarkdown(options) {
  const {
    tag,
    generatedAt,
    targetSha,
    previousTag,
    highlights,
    sections,
    breakingChanges,
    assurance,
    evidence,
    issues,
  } = options;

  const lines = [];
  lines.push(`# ${tag} Release Notes`);
  lines.push('');
  lines.push(`- **Date (UTC):** ${generatedAt}`);
  lines.push(`- **Commit:** \`${targetSha}\``);
  if (previousTag) {
    lines.push(`- **Previous Tag:** \`${previousTag}\``);
  }

  lines.push('');
  lines.push('## Highlights');
  if (highlights.length === 0) {
    lines.push('None.');
  } else {
    highlights.forEach(pr => lines.push(formatPullRequest(pr)));
  }

  lines.push('');
  lines.push('## Changelog');
  for (const [section, pullRequests] of Object.entries(sections)) {
    lines.push('');
    lines.push(`### ${section}`);
    if (pullRequests.length === 0) {
      lines.push('None.');
    } else {
      pullRequests.forEach(pr => lines.push(formatPullRequest(pr)));
    }
  }

  lines.push('');
  lines.push('## Breaking Changes');
  if (breakingChanges.length === 0) {
    lines.push('None.');
  } else {
    breakingChanges.forEach(pr => lines.push(formatPullRequest(pr)));
  }

  lines.push('');
  lines.push('## Assurance (Trust Snapshot)');
  lines.push(`- **GA Gate Status:** ${assurance.gaGateStatus}`);
  lines.push(`- **Governance Verdict:** ${assurance.governanceVerdict}`);
  lines.push(`- **SBOM Summary:** ${assurance.sbomSummary}`);
  lines.push(`- **Vulnerability Counts:** ${assurance.vulnerabilitySummary}`);
  lines.push(`- **Reproducible Build:** ${assurance.reproducibleBuild}`);
  lines.push(`- **Provenance Presence:** ${assurance.provenancePresence}`);
  lines.push(`- **Schema Hash:** ${assurance.schemaHash}`);

  lines.push('');
  lines.push('## Evidence');
  lines.push(`- **Evidence Bundle:** ${evidence.bundleFile} (${evidence.bundleDigest})`);
  lines.push(`- **Evidence Manifest:** ${evidence.manifestFile} (${evidence.manifestDigest})`);
  lines.push(`- **Trust Snapshot:** ${evidence.trustSnapshotFile} (${evidence.trustSnapshotDigest})`);

  if (issues.length > 0) {
    lines.push('');
    lines.push('## Issues');
    issues.forEach(issue => lines.push(`- #${issue}`));
  }

  lines.push('');
  return lines.join('\n');
}

export function buildReleaseNotesJson(options) {
  return {
    tag: options.tag,
    generated_at: options.generatedAt,
    target_sha: options.targetSha,
    previous_tag: options.previousTag,
    highlights: options.highlights,
    sections: options.sections,
    breaking_changes: options.breakingChanges,
    assurance: options.assurance,
    evidence: options.evidence,
    issues: options.issues,
    metadata: options.metadata,
  };
}
