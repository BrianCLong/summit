import { createHash, randomUUID } from 'crypto';
import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import logger from '../../config/logger.js';
import { FixtureCaseBundleStore } from './FixtureCaseBundleStore.js';
import {
  BundleCase,
  BundleEvidence,
  BundleGraphEdge,
  BundleGraphNode,
  BundleNote,
  CaseBundleExportOptions,
  CaseBundleExportResult,
  CaseBundleImportOptions,
  CaseBundleImportResult,
  CaseBundleManifest,
  CaseBundleManifestEntry,
  CaseBundleMappingReport,
  CaseBundleStore,
} from './types.js';

const bundleLogger = logger.child({ name: 'CaseBundleService' });

type IncludeConfig = {
  evidence: boolean;
  graph: boolean;
  notes: boolean;
};

const DEFAULT_INCLUDE: IncludeConfig = {
  evidence: true,
  graph: true,
  notes: true,
};

export class CaseBundleService {
  constructor(private readonly store: CaseBundleStore = new FixtureCaseBundleStore()) {}

  async exportCases(
    caseIds: string[],
    options: CaseBundleExportOptions = {},
  ): Promise<CaseBundleExportResult> {
    if (!caseIds || caseIds.length === 0) {
      throw new Error('case_ids_required');
    }

    const include = this.resolveInclude(options.include);
    const bundlePath = options.targetDir
      ? this.resolveAllowedPath(options.targetDir)
      : await fs.mkdtemp(path.join(tmpdir(), 'case-bundle-'));

    await fs.mkdir(bundlePath, { recursive: true });

    const cases = await this.store.getCases(caseIds);
    if (cases.length !== caseIds.length) {
      const missing = caseIds.filter((id) => !cases.find((c) => c.id === id));
      throw new Error(`missing_cases:${missing.join(',')}`);
    }

    const evidence = include.evidence ? await this.store.getEvidence(caseIds) : [];
    const notes = include.notes ? await this.store.getNotes(caseIds) : [];
    const graph = include.graph
      ? await this.store.getGraphSubset(caseIds)
      : { nodes: [], edges: [] };
    const generatedAt = options.generatedAt || new Date().toISOString();

    const manifestBase: Omit<CaseBundleManifest, 'bundleHash'> = {
      version: 'case-bundle-v1',
      generatedAt,
      cases: [],
      evidence: [],
      notes: [],
      graph: { nodes: [], edges: [] },
    };

    for (const caseRecord of this.sortById(cases)) {
      const artifactPath = `cases/${caseRecord.id}.json`;
      const hash = await this.writeOrderedJson(bundlePath, artifactPath, caseRecord);
      manifestBase.cases.push({
        id: caseRecord.id,
        path: artifactPath,
        hash,
        type: 'case',
      });
    }

    for (const evidenceRecord of this.sortById(evidence)) {
      const artifactPath = `evidence/${evidenceRecord.id}.json`;
      const hash = await this.writeOrderedJson(
        bundlePath,
        artifactPath,
        evidenceRecord,
      );
      manifestBase.evidence.push({
        id: evidenceRecord.id,
        caseId: evidenceRecord.caseId,
        type: evidenceRecord.type,
        path: artifactPath,
        hash,
      });
    }

    for (const note of this.sortById(notes)) {
      const artifactPath = `notes/${note.id}.json`;
      const hash = await this.writeOrderedJson(bundlePath, artifactPath, note);
      manifestBase.notes.push({
        id: note.id,
        caseId: note.caseId,
        path: artifactPath,
        hash,
        type: 'note',
      });
    }

    for (const node of this.sortById(graph.nodes)) {
      const artifactPath = `graph/nodes/${node.id}.json`;
      const hash = await this.writeOrderedJson(bundlePath, artifactPath, node);
      manifestBase.graph.nodes.push({
        id: node.id,
        caseId: node.caseId,
        path: artifactPath,
        hash,
        type: node.type,
        label: node.label,
      });
    }

    for (const edge of this.sortById(graph.edges)) {
      const artifactPath = `graph/edges/${edge.id}.json`;
      const hash = await this.writeOrderedJson(bundlePath, artifactPath, edge);
      manifestBase.graph.edges.push({
        id: edge.id,
        path: artifactPath,
        hash,
        type: edge.label,
      });
    }

    const manifestWithoutHash = this.orderValue(
      manifestBase,
    ) as Omit<CaseBundleManifest, 'bundleHash'>;
    const bundleHash = this.hashValue(this.manifestHashInput(manifestBase));
    const manifest: CaseBundleManifest = this.orderValue({
      ...manifestWithoutHash,
      bundleHash,
    }) as CaseBundleManifest;

    const manifestPath = path.join(bundlePath, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    let archivePath: string | undefined;
    if (options.format === 'zip') {
      archivePath = await this.createArchive(bundlePath);
    }

    bundleLogger.info(
      { bundlePath, archivePath, caseCount: cases.length },
      'Generated case bundle',
    );

    return { bundlePath, archivePath, manifest };
  }

  async importBundle(
    bundlePath: string,
    options: CaseBundleImportOptions = {},
  ): Promise<CaseBundleImportResult> {
    const include = this.resolveInclude(options.include);
    const workingDir = await this.ensureDirectory(bundlePath);
    const manifestPath = path.join(workingDir, 'manifest.json');
    const manifestRaw = await fs.readFile(manifestPath, 'utf-8');
    const manifest: CaseBundleManifest = JSON.parse(manifestRaw);

    const { bundleHash } = manifest;
    const manifestForHash = this.manifestHashInput({
      version: manifest.version,
      generatedAt: manifest.generatedAt,
      cases: manifest.cases,
      evidence: manifest.evidence,
      notes: manifest.notes,
      graph: manifest.graph,
    });
    const recalculatedHash = this.hashValue(manifestForHash);
    if (bundleHash && recalculatedHash !== bundleHash) {
      throw new Error('bundle_hash_mismatch');
    }

    const mappingReport: CaseBundleMappingReport = {
      generatedAt: new Date().toISOString(),
      sourceBundleHash: bundleHash || recalculatedHash,
      mapping: {
        cases: [],
        evidence: [],
        notes: [],
        graphNodes: [],
        graphEdges: [],
      },
      warnings: [],
      skipped: [],
    };

    const caseEntries = await this.verifyAndLoadEntries<BundleCase>(
      workingDir,
      manifest.cases,
      'case',
    );
    const evidenceEntries = await this.verifyAndLoadEntries<BundleEvidence>(
      workingDir,
      manifest.evidence,
      'evidence',
    );
    const noteEntries = await this.verifyAndLoadEntries<BundleNote>(
      workingDir,
      manifest.notes,
      'note',
    );
    const nodeEntries = await this.verifyAndLoadEntries<BundleGraphNode>(
      workingDir,
      manifest.graph.nodes,
      'graph-node',
    );
    const edgeEntries = await this.verifyAndLoadEntries<BundleGraphEdge>(
      workingDir,
      manifest.graph.edges,
      'graph-edge',
    );

    const idMap = new Map<string, string>();

    for (const entry of caseEntries) {
      const newId = this.generateNewId(entry.parsed.id, options);
      idMap.set(entry.parsed.id, newId);
      mappingReport.mapping.cases.push({
        oldId: entry.parsed.id,
        newId,
        type: 'case',
      });
    }

    if (!include.evidence) {
      mappingReport.skipped.push('evidence');
      mappingReport.warnings.push('evidence import disabled by include flag');
    } else {
      for (const entry of evidenceEntries) {
        const newId = this.generateNewId(entry.parsed.id, options);
        mappingReport.mapping.evidence.push({
          oldId: entry.parsed.id,
          newId,
          type: 'evidence',
          caseId: entry.parsed.caseId,
        });
      }
    }

    if (!include.notes) {
      mappingReport.skipped.push('notes');
      mappingReport.warnings.push('notes import disabled by include flag');
    } else {
      for (const entry of noteEntries) {
        const newId = this.generateNewId(entry.parsed.id, options);
        mappingReport.mapping.notes.push({
          oldId: entry.parsed.id,
          newId,
          type: 'note',
          caseId: entry.parsed.caseId,
        });
      }
    }

    if (!include.graph) {
      mappingReport.skipped.push('graph');
      mappingReport.warnings.push('graph import disabled by include flag');
    } else {
      for (const entry of nodeEntries) {
        const newId = this.generateNewId(entry.parsed.id, options);
        idMap.set(entry.parsed.id, newId);
        mappingReport.mapping.graphNodes.push({
          oldId: entry.parsed.id,
          newId,
          type: 'graph-node',
          caseId: (entry.parsed as BundleGraphNode).caseId,
        });
      }

      for (const entry of edgeEntries) {
        const newId = this.generateNewId(entry.parsed.id, options);
        const edge = entry.parsed as BundleGraphEdge;
        const mappedFrom = idMap.get(edge.from) || edge.from;
        const mappedTo = idMap.get(edge.to) || edge.to;
        mappingReport.mapping.graphEdges.push({
          oldId: entry.parsed.id,
          newId,
          type: 'graph-edge',
          caseId: `${mappedFrom}->${mappedTo}`,
        });
      }
    }

    const mappingPath = path.join(workingDir, 'import-mapping.json');
    await fs.writeFile(mappingPath, JSON.stringify(this.orderValue(mappingReport), null, 2));

    return {
      manifest,
      bundlePath: workingDir,
      mapping: mappingReport,
      mappingPath,
    };
  }

  private async ensureDirectory(bundlePath: string): Promise<string> {
    const safeBundlePath = this.resolveAllowedPath(bundlePath);
    const stats = await fs.stat(safeBundlePath);
    if (stats.isDirectory()) return safeBundlePath;

    if (safeBundlePath.endsWith('.zip')) {
      const extractDir = await fs.mkdtemp(path.join(tmpdir(), 'case-bundle-import-'));
      const zip = new AdmZip(safeBundlePath);
      zip.extractAllTo(extractDir, true);
      return extractDir;
    }

    throw new Error('unsupported_bundle_format');
  }

  private async createArchive(bundlePath: string): Promise<string> {
    const archivePath = `${bundlePath}.zip`;
    const output = createWriteStream(archivePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    const done = new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      archive.on('error', (err: any) => reject(err));
    });

    archive.pipe(output as unknown as NodeJS.WritableStream);
    archive.directory(bundlePath, false);
    archive.finalize();

    await done;
    return archivePath;
  }

  private async writeOrderedJson(
    baseDir: string,
    relativePath: string,
    payload: unknown,
  ): Promise<string> {
    const ordered = this.orderValue(payload);
    const serialized = JSON.stringify(ordered, null, 2);
    const target = this.resolvePathWithinBase(baseDir, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, serialized);
    return this.hashString(serialized);
  }

  private async verifyAndLoadEntries<T extends { id: string }>(
    baseDir: string,
    entries: CaseBundleManifestEntry[],
    kind: string,
  ): Promise<Array<{ manifest: CaseBundleManifestEntry; parsed: T }>> {
    const orderedEntries = this.sortById(entries);
    const loaded: Array<{ manifest: CaseBundleManifestEntry; parsed: T }> = [];

    for (const entry of orderedEntries) {
      const absolutePath = this.resolvePathWithinBase(baseDir, entry.path);
      const fileContent = await fs.readFile(absolutePath, 'utf-8');
      const computedHash = this.hashString(fileContent);
      if (computedHash !== entry.hash) {
        throw new Error(`integrity_mismatch:${kind}:${entry.id}`);
      }
      loaded.push({ manifest: entry, parsed: JSON.parse(fileContent) as T });
    }

    return loaded;
  }

  private manifestHashInput(
    manifest: Omit<CaseBundleManifest, 'bundleHash'>,
  ): Record<string, unknown> {
    return this.orderValue({
      ...manifest,
      generatedAt: '__normalized__',
    }) as Record<string, unknown>;
  }

  private resolveInclude(include?: Partial<IncludeConfig>): IncludeConfig {
    return {
      evidence: include?.evidence ?? DEFAULT_INCLUDE.evidence,
      graph: include?.graph ?? DEFAULT_INCLUDE.graph,
      notes: include?.notes ?? DEFAULT_INCLUDE.notes,
    };
  }

  private hashString(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private hashValue(value: unknown): string {
    return this.hashString(this.stableStringify(value));
  }

  private stableStringify(value: unknown): string {
    return JSON.stringify(this.orderValue(value));
  }

  private orderValue<T>(value: T): T {
    if (Array.isArray(value)) {
      return value.map((v) => this.orderValue(v)) as T;
    }

    if (value && typeof value === 'object') {
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[key] = this.orderValue((value as Record<string, unknown>)[key]);
      }
      return sorted as T;
    }

    return value;
  }

  private sortById<T extends { id: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.id.localeCompare(b.id));
  }

  private generateNewId(sourceId: string, options: CaseBundleImportOptions): string {
    if (options.preserveIds) {
      return options.namespace ? `${options.namespace}:${sourceId}` : sourceId;
    }
    if (options.namespace) {
      return `${options.namespace}:${sourceId}`;
    }
    return randomUUID();
  }

  private resolveAllowedPath(inputPath: string): string {
    const resolved = path.resolve(inputPath);
    if (process.env.CASE_BUNDLE_ALLOW_EXTERNAL_PATHS === 'true') {
      return resolved;
    }
    const workspaceRoot = path.resolve(process.cwd());
    if (resolved === workspaceRoot || resolved.startsWith(`${workspaceRoot}${path.sep}`)) {
      return resolved;
    }
    throw new Error('bundle_path_outside_workspace');
  }

  private resolvePathWithinBase(baseDir: string, inputPath: string): string {
    const baseResolved = path.resolve(baseDir);
    const resolved = path.resolve(baseResolved, inputPath);
    if (resolved === baseResolved || resolved.startsWith(`${baseResolved}${path.sep}`)) {
      return resolved;
    }
    throw new Error('bundle_path_traversal_detected');
  }
}
