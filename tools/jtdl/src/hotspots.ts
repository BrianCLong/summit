import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import {
  DataClassChange,
  DataClassDefinition,
  Hotspot,
  HotspotMatch,
  HotspotScope,
  TaxonomyDiff,
} from './types.js';

const SCOPES: Record<HotspotScope, string[]> = {
  rules: [
    'rules',
    'policy',
    'tools/policy',
    'ga-graphai/packages/policy',
    'tools/rules',
  ],
  schemas: [
    'schema',
    'schemas',
    'server/schema',
    'server/db',
    'server/src',
    'packages/db',
  ],
  prompts: [
    'prompts',
    'samples/prompts',
    'tools/golden-prompts',
    'ga-graphai/packages/web',
    'ga-graphai/packages/policy/prompts',
  ],
  contracts: ['contracts', 'tools/contracts', 'services', 'server/contracts'],
};

const TARGET_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.md',
  '.yaml',
  '.yml',
  '.txt',
];

const buildNeedle = (
  id: string,
  change: DataClassChange | DataClassDefinition,
): string[] => {
  const canonical = [id];
  if ('tags' in change && Array.isArray(change.tags)) {
    canonical.push(...change.tags);
  }
  if ('before' in change && change.before?.tags) {
    canonical.push(...change.before.tags);
  }
  if ('after' in change && change.after?.tags) {
    canonical.push(...change.after.tags);
  }
  return Array.from(new Set(canonical));
};

const locateMatches = async (
  repoRoot: string,
  scope: HotspotScope,
  change: DataClassChange | DataClassDefinition,
  reason: string,
): Promise<Hotspot[]> => {
  const searchRoots = SCOPES[scope]
    .map((segment) => path.resolve(repoRoot, segment))
    .filter((segmentPath) => segmentPath.startsWith(repoRoot));

  const needles = buildNeedle(
    'id' in change ? change.id : (change as DataClassDefinition).id,
    change,
  );

  const patterns = searchRoots.map(
    (segment) => `${segment.replace(/\\/g, '/')}/**/*`,
  );

  const fileCandidates = await fg(patterns, {
    onlyFiles: true,
    dot: false,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    followSymbolicLinks: false,
  });

  const relevant = fileCandidates.filter((candidate) =>
    TARGET_EXTENSIONS.includes(path.extname(candidate)),
  );

  const hotspots: Hotspot[] = [];

  for (const file of relevant) {
    const content = await readFile(file, 'utf-8');
    const lines = content.split(/\r?\n/);
    const matches: HotspotMatch[] = [];

    lines.forEach((lineContent, index) => {
      for (const needle of needles) {
        if (
          needle &&
          lineContent.toLowerCase().includes(needle.toLowerCase())
        ) {
          matches.push({
            file: path.relative(repoRoot, file),
            line: index + 1,
            excerpt: lineContent.trim().slice(0, 160),
          });
          break;
        }
      }
    });

    if (matches.length > 0) {
      hotspots.push({
        scope,
        dataClassId:
          'id' in change ? change.id : (change as DataClassDefinition).id,
        reason,
        matches,
        suggestion: '',
      });
    }
  }

  return hotspots;
};

const mergeHotspots = (hotspots: Hotspot[]): Hotspot[] => {
  const merged = new Map<string, Hotspot>();

  hotspots.forEach((hotspot) => {
    const key = `${hotspot.scope}:${hotspot.dataClassId}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...hotspot,
        matches: [...hotspot.matches],
      });
      return;
    }

    const seen = new Set(
      existing.matches.map((item) => `${item.file}:${item.line}`),
    );

    hotspot.matches.forEach((match) => {
      const identifier = `${match.file}:${match.line}`;
      if (!seen.has(identifier)) {
        existing.matches.push(match);
        seen.add(identifier);
      }
    });
  });

  return Array.from(merged.values()).map((item) => ({
    ...item,
    matches: item.matches.sort((a, b) => {
      if (a.file === b.file) {
        return a.line - b.line;
      }
      return a.file.localeCompare(b.file);
    }),
  }));
};

const buildReason = (change: DataClassChange | DataClassDefinition): string => {
  if ('type' in change && change.type === 'updated' && change.delta) {
    const parts: string[] = [];
    if (change.delta.lawfulBases) {
      parts.push('lawful bases changed');
    }
    if (change.delta.retentionMinimumDays) {
      parts.push('retention minimum updated');
    }
    if (change.delta.description) {
      parts.push('description updated');
    }
    return parts.join(', ');
  }

  if ('type' in change && change.type === 'removed') {
    return 'data class removed';
  }

  return 'new data class registered';
};

const buildSuggestion = (
  change: DataClassChange | DataClassDefinition,
  scope: HotspotScope,
): string => {
  const id = 'type' in change ? change.id : change.id;
  if ('type' in change && change.type === 'updated' && change.delta) {
    const after = change.after ?? change.before;
    const details = [];
    if (change.delta.lawfulBases) {
      details.push(
        `align lawful bases with ${change.delta.lawfulBases.after.join(', ')}`,
      );
    }
    if (change.delta.retentionMinimumDays) {
      details.push(
        `ensure retention minimum is ${change.delta.retentionMinimumDays.after} days`,
      );
    }
    return `Update ${scope} artifacts referencing ${id} to ${details.join(' and ')}.`;
  }

  if ('type' in change && change.type === 'removed') {
    return `Audit ${scope} artifacts that still reference ${id} and consider deprecation.`;
  }

  const definition = change as DataClassDefinition;
  return `Add ${scope} coverage for newly introduced data class ${definition.id}.`;
};

export const findHotspots = async (
  repoRoot: string,
  diff: TaxonomyDiff,
): Promise<Hotspot[]> => {
  const candidates: Hotspot[] = [];

  const handleChange = async (
    change: DataClassChange | DataClassDefinition,
    scope: HotspotScope,
  ): Promise<void> => {
    const reason = buildReason(change);
    const scoped = await locateMatches(repoRoot, scope, change, reason);
    scoped.forEach((item) => {
      item.suggestion = buildSuggestion(change, scope);
      candidates.push(item);
    });
  };

  for (const change of diff.updated) {
    for (const scope of Object.keys(SCOPES) as HotspotScope[]) {
      await handleChange(change, scope);
    }
  }

  for (const added of diff.added) {
    for (const scope of Object.keys(SCOPES) as HotspotScope[]) {
      await handleChange(added, scope);
    }
  }

  for (const removed of diff.removed) {
    const change: DataClassChange = {
      id: removed.id,
      type: 'removed',
      before: removed,
    };
    for (const scope of Object.keys(SCOPES) as HotspotScope[]) {
      await handleChange(change, scope);
    }
  }

  candidates.sort((a, b) => {
    if (a.dataClassId === b.dataClassId) {
      if (a.scope === b.scope) {
        if (a.matches[0] && b.matches[0]) {
          return a.matches[0].file.localeCompare(b.matches[0].file);
        }
        return 0;
      }
      return a.scope.localeCompare(b.scope);
    }
    return a.dataClassId.localeCompare(b.dataClassId);
  });

  return mergeHotspots(candidates);
};
