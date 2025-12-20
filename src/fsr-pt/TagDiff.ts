import { PolicyTags, TagChange, TagDiffReport } from './types.js';

const SENSITIVITY_ORDER = ['public', 'internal', 'confidential', 'restricted', 'secret', 'top-secret'];
const RETENTION_ORDER = ['transient', 'short-term', 'standard', 'extended', 'indefinite'];

function classifyDirection(order: string[], previous: string, current: string): 'higher' | 'lower' | 'unknown' {
  const previousIndex = order.indexOf(previous.toLowerCase());
  const currentIndex = order.indexOf(current.toLowerCase());

  if (previousIndex === -1 || currentIndex === -1) {
    return 'unknown';
  }

  if (currentIndex === previousIndex) {
    return 'unknown';
  }

  return currentIndex > previousIndex ? 'higher' : 'lower';
}

function impactForTag(tag: keyof PolicyTags, previous: string, current: string): string {
  if (!previous || previous === 'n/a') {
    return `Initial ${tag} set to ${current}.`;
  }

  switch (tag) {
    case 'sensitivity': {
      const direction = classifyDirection(SENSITIVITY_ORDER, previous, current);
      if (direction === 'higher') {
        return 'Escalate data handling and access controls.';
      }
      if (direction === 'lower') {
        return 'Data sensitivity reduced; review if controls can be relaxed safely.';
      }
      return 'Sensitivity level adjusted; communicate handling requirements.';
    }
    case 'residency':
      return 'Update deployment and storage to honor residency obligations.';
    case 'retentionClass': {
      const direction = classifyDirection(RETENTION_ORDER, previous, current);
      if (direction === 'higher') {
        return 'Retention window extended; confirm archival and deletion workflows.';
      }
      if (direction === 'lower') {
        return 'Retention shortened; ensure accelerated purge routines.';
      }
      return 'Retention policy changed; notify compliance stakeholders.';
    }
    default:
      return 'Policy tag updated; assess governance implications.';
  }
}

export function diffPolicyTags(previous: PolicyTags | null, current: PolicyTags): TagDiffReport {
  const orderedTags: (keyof PolicyTags)[] = ['sensitivity', 'residency', 'retentionClass'];
  const changes: TagChange[] = [];

  for (const tag of orderedTags) {
    const previousValue = previous ? previous[tag] : 'n/a';
    const currentValue = current[tag];

    if (!previous || previousValue !== currentValue) {
      changes.push({
        tag,
        previous: previousValue,
        current: currentValue,
        impact: impactForTag(tag, previousValue, currentValue),
      });
    }
  }

  const hasChanges = changes.length > 0;

  let summary: string;
  if (!previous) {
    const summaryParts = orderedTags.map((tag) => `${tag}: ${current[tag]}`);
    summary = `Initial policy tags established (${summaryParts.join(', ')}).`;
  } else if (!hasChanges) {
    const summaryParts = orderedTags.map((tag) => `${tag}=${current[tag]}`);
    summary = `Policy tags unchanged (${summaryParts.join(', ')}).`;
  } else {
    const lines = changes.map(
      (change) => `- ${change.tag}: ${change.previous} -> ${change.current} (Impact: ${change.impact})`,
    );
    summary = `Policy tag updates detected:\n${lines.join('\n')}`;
  }

  return { hasChanges, changes, summary };
}
