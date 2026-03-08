const fs = require('node:fs');
const path = require('node:path');

const rulesPath = path.join(__dirname, 'rules.json');
const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

function normalizeLabels(labels = []) {
  return labels.map((label) => (typeof label === 'string' ? label : label.name));
}

function normalizeText(issue) {
  return `${issue.title || ''}\n${issue.body || ''}`.toLowerCase();
}

function hasAnyKeyword(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function detectCategory(text) {
  for (const rule of rules.categoryRules) {
    if (hasAnyKeyword(text, rule.keywords)) {
      return rule.category;
    }
  }
  return 'deps';
}

function hasFailingCheckReference(text) {
  return /(failing\s+(workflow|check)|workflow\s*[:#-]?\s*[\w./-]+|check\s*[:#-]?\s*[\w./-]+|run_id)/i.test(
    text,
  );
}

function classifyIssue(issue) {
  const labels = normalizeLabels(issue.labels);
  const text = normalizeText(issue);

  const isCandidate =
    labels.includes(rules.candidateLabels[0]) || hasAnyKeyword(text, rules.candidateKeywords);

  const hasP0 = labels.includes(rules.labelSignals.p0);
  const hasGaLabel = labels.includes(rules.labelSignals.gaBlocker);
  const hasDomainLabel = labels.some((label) => rules.labelSignals.domain.includes(label));
  const hasGaKeyword = hasAnyKeyword(text, rules.gaBlockerKeywords);
  const hasNegativeLabel = labels.some((label) => rules.labelSignals.negative.includes(label));
  const failingCheckRef = hasFailingCheckReference(text);

  let score = 0;
  if (hasP0) score += rules.weights.p0Label;
  if (hasGaKeyword) score += rules.weights.gaKeyword;
  if (hasGaLabel) score += rules.weights.gaLabel;
  if (hasDomainLabel) score += rules.weights.domainLabel;
  if (failingCheckRef) score += rules.weights.failingCheckReference;
  if (hasNegativeLabel) score += rules.weights.negativeLabel;

  score = Math.max(0, Math.min(100, score));

  const confidence =
    score >= rules.confidence.high
      ? 'high'
      : score >= rules.confidence.medium
        ? 'medium'
        : 'low';

  const priority = score >= rules.confidence.high ? 'prio:P0' : score >= rules.confidence.medium ? 'prio:P1' : null;

  const category = detectCategory(text);

  const desiredLabels = new Set();
  if (isCandidate || priority === 'prio:P0') {
    desiredLabels.add('queue:deterministic');
  }
  if (priority) {
    desiredLabels.add(priority);
  }
  if (hasGaKeyword || hasGaLabel) {
    desiredLabels.add('ga:blocker');
  }
  if (confidence !== 'high') {
    desiredLabels.add('needs-triage');
  }

  const queueOrder = issue.number;

  return {
    rulesVersion: rules.version,
    isCandidate,
    score,
    confidence,
    category,
    priority,
    queueOrder,
    desiredLabels: Array.from(desiredLabels),
  };
}

module.exports = {
  classifyIssue,
  normalizeLabels,
  normalizeText,
};
