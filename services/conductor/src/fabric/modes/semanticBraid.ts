export type StrandKind = 'spec' | 'risk' | 'tests' | 'impl' | 'release';

export interface SemanticStrand {
  kind: StrandKind;
  content: string;
  references?: string[];
}

export interface BraidConstraints {
  acceptanceMetrics: string[];
  declaredTargets: string[];
  helmSchema?: string[];
}

export interface BraidResult {
  consolidated: string;
  issues: string[];
  consistencyProof: { strand: StrandKind; evidence: string }[];
}

export function weaveSemanticBraid(
  strands: SemanticStrand[],
  constraints: BraidConstraints,
): BraidResult {
  const issues: string[] = [];
  const proofs: { strand: StrandKind; evidence: string }[] = [];
  const textParts: string[] = [];

  const byKind = new Map<StrandKind, SemanticStrand>();
  for (const strand of strands) byKind.set(strand.kind, strand);

  if (!byKind.has('spec')) issues.push('Missing spec strand');
  if (!byKind.has('tests')) issues.push('Missing tests strand');

  if (byKind.get('tests')) {
    const invalidRefs = validateTestTargets(
      byKind.get('tests')!,
      constraints.declaredTargets,
    );
    if (invalidRefs.length) {
      issues.push(
        `Tests reference undeclared targets: ${invalidRefs.join(', ')}`,
      );
    } else {
      proofs.push({
        strand: 'tests',
        evidence: 'All test refs map to declared targets',
      });
    }
  }

  if (byKind.get('release')) {
    const release = byKind.get('release')!;
    for (const metric of constraints.acceptanceMetrics) {
      if (!release.content.toLowerCase().includes(metric.toLowerCase())) {
        issues.push(`Release notes missing metric ${metric}`);
      }
    }
  }

  if (byKind.get('impl') && byKind.get('tests')) {
    const impl = byKind.get('impl')!;
    const tests = byKind.get('tests')!;
    const testNames = extractRefs(tests.content);
    const missing = testNames.filter((name) => !impl.content.includes(name));
    if (missing.length) {
      issues.push(
        `Implementation does not reference tests: ${missing.join(', ')}`,
      );
    } else {
      proofs.push({
        strand: 'impl',
        evidence: 'Implementation references all test cases',
      });
    }
  }

  if (byKind.get('spec')) {
    const spec = byKind.get('spec')!;
    textParts.push(`# Spec\n${spec.content}`);
  }
  if (byKind.get('risk'))
    textParts.push(`# Risk\n${byKind.get('risk')!.content}`);
  if (byKind.get('tests'))
    textParts.push(`# Tests\n${byKind.get('tests')!.content}`);
  if (byKind.get('impl'))
    textParts.push(`# Implementation\n${byKind.get('impl')!.content}`);
  if (byKind.get('release'))
    textParts.push(`# Release\n${byKind.get('release')!.content}`);

  return {
    consolidated: textParts.join('\n\n'),
    issues,
    consistencyProof: proofs,
  };
}

function validateTestTargets(
  tests: SemanticStrand,
  declared: string[],
): string[] {
  const refs = tests.references?.length
    ? tests.references
    : extractRefs(tests.content);
  return refs.filter((ref) => !declared.includes(ref));
}

function extractRefs(content: string): string[] {
  const matches = content.match(/\b[A-Z][A-Za-z0-9_\/-]+\b/g);
  if (!matches) return [];
  return [...new Set(matches)];
}
