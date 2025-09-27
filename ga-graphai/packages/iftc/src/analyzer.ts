import {
  AnalysisResult,
  AnnotatedFile,
  FlowDiagnostic,
  FlowEdge,
  Label,
  SecurityLevel,
  Transform,
} from './types';

const SECURITY_RANK: Record<SecurityLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

function formatPurposes(label: Label | undefined): string {
  if (!label) {
    return 'purposes: ∅';
  }
  if (label.purposes.size === 0) {
    return 'purposes: ∅';
  }
  return `purposes: ${Array.from(label.purposes).sort().join(', ')}`;
}

function formatTrace(source: Label | undefined, target: Label | undefined, flow: FlowEdge): string[] {
  const segments: string[] = [];
  const srcDescription = source
    ? `${source.id} [${source.security}] ${formatPurposes(source)} @ ${source.filePath}:${source.line}`
    : `${flow.source} [unlabeled] @ ${flow.filePath}:${flow.line}`;
  segments.push(srcDescription);
  const tgtDescription = target
    ? `${target.id} [${target.security}] ${formatPurposes(target)} @ ${target.filePath}:${target.line}`
    : `${flow.target} [unlabeled] @ ${flow.filePath}:${flow.line}`;
  segments.push(tgtDescription);
  return segments;
}

function buildSuggestionForMissingLabel(node: 'source' | 'target', flow: FlowEdge): string {
  const element = node === 'source' ? flow.source : flow.target;
  return `Declare a label for \`${element}\` using @label before referencing it in flows.`;
}

function buildSuggestionForSecurity(flow: FlowEdge, transform?: Transform): string {
  if (!flow.transform) {
    return 'Annotate the flow with an approved transform using `@flow A -> B via transform-id`.';
  }
  if (!transform) {
    return `Register the transform \`${flow.transform}\` with \`@transform ${flow.transform} kind=transform\`.`;
  }
  return 'Ensure the transform documented with @transform enforces the required downgrade policy.';
}

function buildSuggestionForPurpose(flow: FlowEdge, transform?: Transform): string {
  if (!flow.transform) {
    return 'Route the downgrade through a declared redactor via `@flow A -> B via redactor-id`.';
  }
  if (!transform) {
    return `Register \`${flow.transform}\` as a redactor using \`@redactor ${flow.transform}\`.`;
  }
  if (transform.kind !== 'redactor') {
    return `Mark \`${transform.name}\` as kind=redactor to permit purpose reduction.`;
  }
  return 'Verify the redactor removes purpose-restricted fields before the downgrade.';
}

export function analyzeAnnotatedFiles(files: AnnotatedFile[]): AnalysisResult {
  const labels = new Map<string, Label>();
  const transforms = new Map<string, Transform>();
  const flows: FlowEdge[] = [];
  const errors: FlowDiagnostic[] = [];

  for (const file of files) {
    for (const label of file.labels) {
      labels.set(label.id, label);
    }
    for (const transform of file.transforms) {
      transforms.set(transform.name, transform);
    }
    flows.push(...file.flows);
  }

  const sortedFlows = [...flows].sort((a, b) => {
    if (a.filePath === b.filePath) {
      return a.line - b.line;
    }
    return a.filePath.localeCompare(b.filePath);
  });

  for (const flow of sortedFlows) {
    const source = labels.get(flow.source);
    const target = labels.get(flow.target);
    if (!source) {
      errors.push({
        type: 'missing-label',
        message: `Flow references source \`${flow.source}\` which is not labeled.`,
        trace: formatTrace(undefined, target, flow),
        suggestion: buildSuggestionForMissingLabel('source', flow),
        filePath: flow.filePath,
        line: flow.line,
      });
      continue;
    }
    if (!target) {
      errors.push({
        type: 'missing-label',
        message: `Flow references target \`${flow.target}\` which is not labeled.`,
        trace: formatTrace(source, undefined, flow),
        suggestion: buildSuggestionForMissingLabel('target', flow),
        filePath: flow.filePath,
        line: flow.line,
      });
      continue;
    }

    const transform = flow.transform ? transforms.get(flow.transform) : undefined;
    const sourceRank = SECURITY_RANK[source.security];
    const targetRank = SECURITY_RANK[target.security];

    if (sourceRank > targetRank) {
      if (!flow.transform) {
        errors.push({
          type: 'security-violation',
          message: `High to low security flow \`${source.id} -> ${target.id}\` lacks an approved transform.`,
          trace: formatTrace(source, target, flow),
          suggestion: buildSuggestionForSecurity(flow, transform),
          filePath: flow.filePath,
          line: flow.line,
        });
        continue;
      }
      if (flow.transform && !transform) {
        errors.push({
          type: 'security-violation',
          message: `Transform \`${flow.transform}\` is not registered for flow \`${source.id} -> ${target.id}\`.`,
          trace: formatTrace(source, target, flow),
          suggestion: buildSuggestionForSecurity(flow, transform),
          filePath: flow.filePath,
          line: flow.line,
        });
        continue;
      }
    }

    const targetPurposes = target.purposes;
    const sourcePurposes = source.purposes;

    const missingPurposes = Array.from(targetPurposes).filter((purpose) => !sourcePurposes.has(purpose));
    if (missingPurposes.length > 0) {
      errors.push({
        type: 'purpose-violation',
        message: `Flow introduces unauthorized purposes (${missingPurposes.join(', ')}) for \`${target.id}\`.`,
        trace: formatTrace(source, target, flow),
        suggestion: `Extend the source consent to include ${missingPurposes.join(', ')} or block the flow.`,
        filePath: flow.filePath,
        line: flow.line,
      });
      continue;
    }

    const isDowngrade =
      targetPurposes.size > 0 &&
      targetPurposes.size < sourcePurposes.size &&
      Array.from(targetPurposes).every((purpose) => sourcePurposes.has(purpose));

    if (isDowngrade) {
      if (!flow.transform) {
        errors.push({
          type: 'purpose-violation',
          message: `Purpose downgrade on \`${source.id} -> ${target.id}\` must pass through a redactor.`,
          trace: formatTrace(source, target, flow),
          suggestion: buildSuggestionForPurpose(flow),
          filePath: flow.filePath,
          line: flow.line,
        });
        continue;
      }
      if (!transform) {
        errors.push({
          type: 'purpose-violation',
          message: `Purpose downgrade references \`${flow.transform}\` but it is not registered as a redactor.`,
          trace: formatTrace(source, target, flow),
          suggestion: buildSuggestionForPurpose(flow, transform),
          filePath: flow.filePath,
          line: flow.line,
        });
        continue;
      }
      if (transform.kind !== 'redactor') {
        errors.push({
          type: 'purpose-violation',
          message: `Purpose downgrade requires \`${transform.name}\` to be marked kind=redactor.`,
          trace: formatTrace(source, target, flow),
          suggestion: buildSuggestionForPurpose(flow, transform),
          filePath: flow.filePath,
          line: flow.line,
        });
        continue;
      }
    }
  }

  errors.sort((a, b) => {
    if (a.filePath === b.filePath) {
      if (a.line === b.line) {
        return a.message.localeCompare(b.message);
      }
      return a.line - b.line;
    }
    return a.filePath.localeCompare(b.filePath);
  });

  return {
    labels,
    flows: sortedFlows,
    transforms,
    errors,
  };
}
