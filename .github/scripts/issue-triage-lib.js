const LABEL_DEFINITIONS = {
  'type:bug': { color: 'd73a4a', description: 'Bug or regression' },
  'type:feature': { color: 'a2eeef', description: 'New feature or enhancement' },
  'type:chore': { color: 'c2e0c6', description: 'Maintenance or upkeep' },
  'type:security': { color: 'b60205', description: 'Security vulnerability or hardening' },
  'type:docs': { color: '0075ca', description: 'Documentation update' },
  'type:ci': { color: '5319e7', description: 'CI or workflow change' },
  'priority:P0': { color: 'b60205', description: 'Ship-stopper' },
  'priority:P1': { color: 'd93f0b', description: 'High priority' },
  'priority:P2': { color: 'fbca04', description: 'Medium priority' },
  'priority:P3': { color: 'fef2c0', description: 'Backlog priority' },
  'area:server': { color: '1d76db', description: 'Server/API' },
  'area:client': { color: '0e8a16', description: 'Client app' },
  'area:web': { color: '7057ff', description: 'Web app' },
  'area:packages': { color: '9a6700', description: 'Shared packages' },
  'area:cli': { color: 'bfd4f2', description: 'CLI tooling' },
  'area:ci': { color: '5319e7', description: 'CI/CD or pipelines' },
  'area:docs': { color: '0075ca', description: 'Documentation' },
  'area:governance': { color: '8c564b', description: 'Policy and governance' },
  'area:security': { color: 'e11d21', description: 'Security and compliance' },
  'area:release': { color: 'f9d0c4', description: 'Release management' },
  'ga:blocker': { color: '000000', description: 'GA ship blocker' },
  'ga:hard-gate': { color: '4c1d95', description: 'GA hard gate' },
  'ga:polish': { color: 'c2e0c6', description: 'GA polish' },
  'post-ga': { color: '6e7781', description: 'Post-GA work' },
  'triage:needed': { color: 'cfd3d7', description: 'Needs triage' },
  'triage:ready': { color: '0e8a16', description: 'Triage complete' },
  'triage:blocked': { color: '000000', description: 'Blocked on dependency' },
  'triage:needs-info': { color: 'fef2c0', description: 'Needs more info' },
  'triage:duplicate': { color: '6e7781', description: 'Duplicate issue' },
};

const TYPE_MATCHERS = [
  { regex: /\bsecurity\b|\bcve\b|\bvuln\b|\bdependabot\b/i, label: 'type:security' },
  { regex: /\bbug\b|\bcrash\b|\bexception\b|\bregression\b/i, label: 'type:bug' },
  { regex: /\bdoc\b|\bdocs\b|\breadme\b/i, label: 'type:docs' },
  { regex: /\bci\b|\bworkflow\b|\bactions\b|\bga:verify\b/i, label: 'type:ci' },
  { regex: /\bchore\b|\bmaintenance\b|\bcleanup\b|\bdeps\b/i, label: 'type:chore' },
];

const AREA_MATCHERS = [
  { label: 'area:server', regex: /\bserver\b|\bapi\b|\bbackend\b|\bneo4j\b|\bpostgres\b/i },
  { label: 'area:client', regex: /\bclient\b|\bui\b|\bfrontend\b|\breact\b/i },
  { label: 'area:web', regex: /\bweb\b|\bapps\/web\b/i },
  { label: 'area:packages', regex: /\bpackages\b|\bshared\b/i },
  { label: 'area:cli', regex: /\bcli\b|\bcommand\b|\bsummitctl\b/i },
  { label: 'area:ci', regex: /\bworkflow\b|\bactions\b|\bci\b|\bpipeline\b/i },
  { label: 'area:docs', regex: /\bdocs\b|\breadme\b/i },
  { label: 'area:governance', regex: /\bpolicy\b|\bgov\b|\bopa\b|\bslsa\b|\bsbom\b|\bevidence\b/i },
  { label: 'area:security', regex: /\bsecurity\b|\bauth\b|\brbac\b|\babac\b/i },
  { label: 'area:release', regex: /\brelease\b|\bga\b|\brc\b|\bhotfix\b/i },
];

const PRIORITY_MATCHERS = [
  { regex: /\b(p0)\b|\[p0\]|\(p0\)|priority:\s*p0/i, label: 'priority:P0' },
  { regex: /\b(p1)\b|\[p1\]|\(p1\)|priority:\s*p1/i, label: 'priority:P1' },
  { regex: /\b(p2)\b|\[p2\]|\(p2\)|priority:\s*p2/i, label: 'priority:P2' },
  { regex: /\b(p3)\b|\[p3\]|\(p3\)|priority:\s*p3/i, label: 'priority:P3' },
];

function normalizeText(issue) {
  const title = issue.title || '';
  const body = issue.body || '';
  const labels = Array.isArray(issue.labels)
    ? issue.labels.map((l) => (typeof l === 'string' ? l : l.name)).join(' ')
    : '';
  return `${title}\n${body}\n${labels}`.toLowerCase();
}

function detectType(text) {
  for (const matcher of TYPE_MATCHERS) {
    if (matcher.regex.test(text)) {
      return matcher.label;
    }
  }
  return 'type:feature';
}

function detectPriority(title) {
  for (const matcher of PRIORITY_MATCHERS) {
    if (matcher.regex.test(title)) {
      return matcher.label;
    }
  }
  return null;
}

function detectAreas(text) {
  const matches = [];
  for (const matcher of AREA_MATCHERS) {
    if (matcher.regex.test(text)) {
      matches.push(matcher.label);
    }
  }
  return matches;
}

function resolveMilestoneTitle(labels) {
  if (labels.has('ga:blocker') || labels.has('priority:P0')) {
    return 'GA Hard Gate';
  }
  if (labels.has('priority:P1')) {
    return '30-Day';
  }
  if (labels.has('priority:P2')) {
    return '60-Day';
  }
  if (labels.has('priority:P3')) {
    return 'Backlog';
  }
  return null;
}

module.exports = {
  LABEL_DEFINITIONS,
  detectAreas,
  detectPriority,
  detectType,
  normalizeText,
  resolveMilestoneTitle,
};
