import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface DesignSourceArtifacts {
  design: Record<string, unknown>;
  screens: Array<Record<string, unknown>>;
  html?: Record<string, string>;
  css?: Record<string, string>;
}

export interface DesignImportRequest {
  designId: string;
  evidencePeriod: string;
  source: DesignSourceArtifacts;
  outputRoot?: string;
}

export interface DesignImportResult {
  artifactDir: string;
  designId: string;
  evidenceId: string;
  writtenFiles: string[];
}

const SAFE_ID = /^[a-z0-9][a-z0-9-]{2,63}$/;
const SAFE_FILENAME = /^[a-z0-9][a-z0-9._-]*$/i;

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortKeysDeep(entry));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort((a, b) => a.localeCompare(b))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

export function stableJson(value: unknown): string {
  return `${JSON.stringify(sortKeysDeep(value), null, 2)}\n`;
}

function assertSafeRelativePath(root: string, relativePath: string): string {
  const resolved = path.resolve(root, relativePath);
  const normalizedRoot = `${root}${path.sep}`;

  if (resolved === root || resolved.startsWith(normalizedRoot)) {
    return resolved;
  }

  throw new Error(`Refusing to write outside artifact root: ${relativePath}`);
}

function assertSafeAssetFileName(fileName: string): void {
  if (!SAFE_FILENAME.test(fileName)) {
    throw new Error(`Invalid asset filename: ${fileName}`);
  }

  if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) {
    throw new Error(`Unsafe asset filename: ${fileName}`);
  }
}

export function sanitizeHtml(input: string): { sanitized: string; removedScriptTags: number } {
  const scriptMatches = input.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) ?? [];
  const withoutScripts = input.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const withoutInlineHandlers = withoutScripts.replace(/\son[a-z]+=(["']).*?\1/gi, '');

  return {
    sanitized: withoutInlineHandlers,
    removedScriptTags: scriptMatches.length,
  };
}

function buildEvidenceId(
  evidencePeriod: string,
  source: DesignSourceArtifacts,
  sanitizedHtml: Record<string, string>,
  cssAssets: Record<string, string>,
): string {
  if (!/^[0-9]{6}$/.test(evidencePeriod)) {
    throw new Error('evidencePeriod must be YYYYMM format.');
  }

  const payload = stableJson({
    design: source.design,
    screens: source.screens,
    html: sanitizedHtml,
    css: cssAssets,
  });

  const hash = crypto.createHash('sha256').update(payload).digest('hex').slice(0, 12).toUpperCase();
  return `SUMMIT-DESIGN-${evidencePeriod}-${hash}`;
}

async function writeTextFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

/**
 * Deterministically imports design artifacts into the governed artifact tree.
 */
export async function importDesignArtifacts(
  request: DesignImportRequest,
): Promise<DesignImportResult> {
  if (!SAFE_ID.test(request.designId)) {
    throw new Error('designId must be kebab-case and at least 3 characters.');
  }

  const outputRoot = path.resolve(request.outputRoot ?? process.cwd());
  const artifactDir = path.resolve(outputRoot, 'artifacts', 'ui-design', request.designId);
  const htmlDir = path.resolve(artifactDir, 'html');
  const cssDir = path.resolve(artifactDir, 'css');

  const htmlEntries = Object.entries(request.source.html ?? {}).sort(([left], [right]) => left.localeCompare(right));
  const cssEntries = Object.entries(request.source.css ?? {}).sort(([left], [right]) => left.localeCompare(right));

  const sanitizedHtml: Record<string, string> = {};
  const sanitizedCss: Record<string, string> = {};

  let removedScriptTags = 0;

  for (const [fileName, content] of htmlEntries) {
    assertSafeAssetFileName(fileName);
    const sanitized = sanitizeHtml(content);
    removedScriptTags += sanitized.removedScriptTags;
    sanitizedHtml[fileName] = sanitized.sanitized;
  }

  for (const [fileName, content] of cssEntries) {
    assertSafeAssetFileName(fileName);
    sanitizedCss[fileName] = content;
  }

  const evidenceId = buildEvidenceId(request.evidencePeriod, request.source, sanitizedHtml, sanitizedCss);

  const writtenFiles: string[] = [];

  const designJsonPath = assertSafeRelativePath(artifactDir, 'design.json');
  const screensJsonPath = assertSafeRelativePath(artifactDir, 'screens.json');

  await writeTextFile(designJsonPath, stableJson(request.source.design));
  await writeTextFile(screensJsonPath, stableJson(request.source.screens));
  writtenFiles.push(designJsonPath, screensJsonPath);

  for (const [fileName, content] of Object.entries(sanitizedHtml).sort(([left], [right]) => left.localeCompare(right))) {
    const outPath = assertSafeRelativePath(htmlDir, fileName);
    await writeTextFile(outPath, content);
    writtenFiles.push(outPath);
  }

  for (const [fileName, content] of Object.entries(sanitizedCss).sort(([left], [right]) => left.localeCompare(right))) {
    const outPath = assertSafeRelativePath(cssDir, fileName);
    await writeTextFile(outPath, content);
    writtenFiles.push(outPath);
  }

  const writtenRelativePaths = writtenFiles
    .map((filePath) => path.relative(outputRoot, filePath).split(path.sep).join('/'))
    .sort((a, b) => a.localeCompare(b));

  const report = {
    schema_version: 1,
    gate: 'design-artifact-import',
    design_id: request.designId,
    evidence_id: evidenceId,
    written_paths: writtenRelativePaths,
    sanitization: {
      script_tags_removed: removedScriptTags,
    },
  };

  const metrics = {
    schema_version: 1,
    design_id: request.designId,
    evidence_id: evidenceId,
    counts: {
      css_files: cssEntries.length,
      html_files: htmlEntries.length,
      screens: request.source.screens.length,
      writes: writtenRelativePaths.length,
    },
  };

  const stampPayload = `${stableJson(report)}${stableJson(metrics)}`;
  const stamp = {
    schema_version: 1,
    design_id: request.designId,
    evidence_id: evidenceId,
    content_hash: crypto.createHash('sha256').update(stampPayload).digest('hex'),
  };

  const reportPath = assertSafeRelativePath(artifactDir, 'report.json');
  const metricsPath = assertSafeRelativePath(artifactDir, 'metrics.json');
  const stampPath = assertSafeRelativePath(artifactDir, 'stamp.json');

  await writeTextFile(reportPath, stableJson(report));
  await writeTextFile(metricsPath, stableJson(metrics));
  await writeTextFile(stampPath, stableJson(stamp));

  writtenFiles.push(reportPath, metricsPath, stampPath);

  return {
    artifactDir,
    designId: request.designId,
    evidenceId,
    writtenFiles: writtenFiles
      .map((filePath) => path.relative(outputRoot, filePath).split(path.sep).join('/'))
      .sort((a, b) => a.localeCompare(b)),
  };
}
