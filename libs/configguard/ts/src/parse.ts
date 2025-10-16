import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  parseDocument,
  isMap,
  isSeq,
  YAMLMap,
  YAMLSeq,
  Scalar,
  Document,
} from 'yaml';
import type { Diagnostic, LoadResult, Position } from './types';
import { interpolateConfig } from './interpolate';

export interface ParsedConfig<T = unknown> {
  document: Document.Parsed;
  value: T | null;
  diagnostics: Diagnostic[];
  pointerMap: Record<string, Position>;
}

export function parseConfigFile(filePath: string): ParsedConfig {
  const absolute = resolve(filePath);
  const raw = readFileSync(absolute, 'utf8');
  const doc = parseDocument(raw, {
    prettyErrors: true,
    keepCstNodes: true,
    uniqueKeys: false,
  });

  const diagnostics: Diagnostic[] = [];
  const pointerMap: Record<string, Position> = {};

  if (doc.errors.length) {
    for (const err of doc.errors) {
      diagnostics.push({
        severity: 'error',
        message: err.message,
        pointer: '',
        line: err.linePos?.[0]?.line ?? err.line ?? 0,
        column: err.linePos?.[0]?.col ?? err.col ?? 0,
      });
    }
  }

  if (doc.warnings.length) {
    for (const warning of doc.warnings) {
      diagnostics.push({
        severity: 'warning',
        message: warning.message,
        pointer: '',
        line: warning.linePos?.[0]?.line ?? warning.line ?? 0,
        column: warning.linePos?.[0]?.col ?? warning.col ?? 0,
      });
    }
  }

  if (doc.errors.length) {
    return { document: doc, value: null, diagnostics, pointerMap };
  }

  if (!doc.contents) {
    pointerMap[''] = { line: 1, column: 1 };
    return { document: doc, value: null, diagnostics, pointerMap };
  }

  collectPointers(doc.contents, '', doc, pointerMap);
  const value = doc.toJS({ mapAsMap: false, merge: true }) as unknown;
  return { document: doc, value, diagnostics, pointerMap };
}

export function loadConfig(
  filePath: string,
  schema: object | string,
  options: LoadOptions = {},
): LoadResult {
  const parsed = parseConfigFile(filePath);
  const diagnostics = [...parsed.diagnostics];

  if (!parsed.value) {
    return { config: null, diagnostics, pointerMap: parsed.pointerMap };
  }

  const interpolationPolicy = options.interpolation ?? {};
  const interpolated = interpolateConfig(
    parsed.value,
    '',
    { policy: interpolationPolicy, pointerMap: parsed.pointerMap },
    diagnostics,
  );

  const validationDiagnostics = validate(interpolated, schema, {
    pointerMap: parsed.pointerMap,
  });

  diagnostics.push(...validationDiagnostics);

  return {
    config:
      validationDiagnostics.some((d) => d.severity === 'error') &&
      options.strict
        ? null
        : interpolated,
    diagnostics,
    pointerMap: parsed.pointerMap,
  };
}

function collectPointers(
  node: YAMLMap.Parsed | YAMLSeq.Parsed | Scalar.Parsed | null,
  pointer: string,
  doc: Document.Parsed,
  pointerMap: Record<string, Position>,
): void {
  if (!node) {
    return;
  }

  const range = node.range ? doc.rangeAsLinePos(node.range) : undefined;
  if (range) {
    pointerMap[pointer] = {
      line: range.start.line + 1,
      column: range.start.col + 1,
    };
  } else if (!(pointer in pointerMap)) {
    pointerMap[pointer] = { line: 0, column: 0 };
  }

  if (isMap(node)) {
    for (const item of node.items) {
      const key = item.key as Scalar.Parsed;
      const value = item.value as
        | YAMLMap.Parsed
        | YAMLSeq.Parsed
        | Scalar.Parsed
        | null;
      const keyValue = key?.value?.toString() ?? '';
      const childPointer = pointer
        ? `${pointer}/${escapeJsonPointerSegment(keyValue)}`
        : `/${escapeJsonPointerSegment(keyValue)}`;
      collectPointers(value, childPointer, doc, pointerMap);
    }
  } else if (isSeq(node)) {
    node.items.forEach((child, index) => {
      collectPointers(child as any, `${pointer}/${index}`, doc, pointerMap);
    });
  }
}

import type { LoadOptions } from './types';
import { validate } from './validate';
import { escapeJsonPointerSegment } from './interpolate';
