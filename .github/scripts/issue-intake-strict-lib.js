const REQUIRED_FIELDS = [
  { key: 'priority', label: 'Priority' },
  { key: 'area', label: 'Area' },
  { key: 'type', label: 'Type' },
  { key: 'reproducibility', label: 'Reproducibility' },
  { key: 'reproduction steps', label: 'Reproduction steps' },
  { key: 'acceptance criteria', label: 'Acceptance criteria' },
];

const PRIORITY_VALUES = new Set(['P0', 'P1', 'P2', 'P3']);
const AREA_VALUES = new Set([
  'server',
  'client',
  'web',
  'cli',
  'ci',
  'docs',
  'governance',
  'security',
  'release',
]);
const TYPE_VALUES = new Set(['bug', 'feature', 'security']);
const REPRODUCIBILITY_VALUES = new Set([
  'always',
  'often',
  'sometimes',
  'rarely',
  'unable to reproduce',
]);

const VALUE_PLACEHOLDERS = new Set([
  '_no response_',
  'no response',
  'n/a',
  'na',
  'none',
]);

const CHECKLIST_MARKER = '<!-- strict-triage-checklist -->';
const MANAGED_MILESTONES = new Set(['GA Hard Gate', '30-Day', '60-Day', 'Backlog']);
const RESTRICTED_LABELS = new Set(['priority:P0', 'priority:P1', 'ga:blocker', 'ga:hard-gate']);

function normalizeFieldKey(value) {
  return value.trim().toLowerCase();
}

function normalizeValue(value) {
  if (!value) {
    return '';
  }
  const firstLine = value
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return (firstLine || '').trim();
}

function isMeaningfulValue(value) {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return false;
  }
  return !VALUE_PLACEHOLDERS.has(normalized);
}

function parseIssueForm(body = '') {
  const fields = new Map();
  const pattern = /^###\s+(.+)\n([\s\S]*?)(?=\n###\s+|$)/gm;
  let match;

  while ((match = pattern.exec(body)) !== null) {
    const key = normalizeFieldKey(match[1]);
    const value = match[2].trim();
    fields.set(key, value);
  }

  return fields;
}

function readField(fields, key) {
  const raw = fields.get(key);
  return normalizeValue(raw || '');
}

function isValidFieldValue(key, value) {
  if (!isMeaningfulValue(value)) {
    return false;
  }
  if (key === 'priority') {
    return PRIORITY_VALUES.has(value.toUpperCase());
  }
  if (key === 'area') {
    return AREA_VALUES.has(value.toLowerCase());
  }
  if (key === 'type') {
    return TYPE_VALUES.has(value.toLowerCase());
  }
  if (key === 'reproducibility') {
    return REPRODUCIBILITY_VALUES.has(value.toLowerCase());
  }
  return true;
}

function getMissingFields(fields) {
  const missing = [];
  for (const field of REQUIRED_FIELDS) {
    const value = readField(fields, field.key);
    if (!isValidFieldValue(field.key, value)) {
      missing.push(field.label);
    }
  }
  return missing;
}

function deriveLabelsFromFields(fields) {
  const priorityValue = readField(fields, 'priority');
  const areaValue = readField(fields, 'area');
  const typeValue = readField(fields, 'type');

  const priorityLabel = PRIORITY_VALUES.has(priorityValue.toUpperCase())
    ? `priority:${priorityValue.toUpperCase()}`
    : null;
  const areaLabel = AREA_VALUES.has(areaValue.toLowerCase())
    ? `area:${areaValue.toLowerCase()}`
    : null;
  const typeLabel = TYPE_VALUES.has(typeValue.toLowerCase())
    ? `type:${typeValue.toLowerCase()}`
    : null;

  return { priorityLabel, areaLabel, typeLabel };
}

function buildChecklistComment(missingFields) {
  const checklist = missingFields.map((field) => `- [ ] ${field}`).join('\n');

  return `${CHECKLIST_MARKER}
**Triage intake incomplete.** Complete the missing required fields to unlock \`triage:ready\`.

Missing required fields:
${checklist}

Once updated, the automation will re-check and apply priority/area/type labels.`;
}

module.exports = {
  REQUIRED_FIELDS,
  CHECKLIST_MARKER,
  MANAGED_MILESTONES,
  RESTRICTED_LABELS,
  buildChecklistComment,
  deriveLabelsFromFields,
  getMissingFields,
  parseIssueForm,
  readField,
};
