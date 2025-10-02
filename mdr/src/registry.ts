import fs from 'fs';
import path from 'path';
import { diffLines } from 'diff';
import { discoverSpecFiles, loadSpecFromFile } from './loader';
import {
  CompiledArtifactSet,
  Dialect,
  MetricSpec,
  RegistryOptions,
  SpecRecord
} from './types';
import { renderUdfSql, renderViewSql } from './sql/generators';
import { canonicalizeSpec, ensureDir, writeFileIfChanged } from './utils';

export class MetricRegistry {
  private readonly specsRoot: string;
  private readonly outputRoot: string;
  private readonly goldenRoot: string;
  private specCache?: Map<string, SpecRecord[]>;

  constructor(options: RegistryOptions = {}) {
    this.specsRoot = options.specsRoot ?? path.resolve(process.cwd(), 'specs');
    this.outputRoot = options.outputRoot ?? path.resolve(process.cwd(), 'dist');
    this.goldenRoot = options.goldenRoot ?? path.resolve(process.cwd(), 'golden');
  }

  load(): Map<string, SpecRecord[]> {
    if (this.specCache) {
      return this.specCache;
    }
    const files = discoverSpecFiles(this.specsRoot);
    const metrics = new Map<string, SpecRecord[]>();
    for (const file of files) {
      const record = loadSpecFromFile(file);
      const entries = metrics.get(record.spec.name) ?? [];
      entries.push(record);
      metrics.set(record.spec.name, entries);
    }
    for (const [name, records] of metrics.entries()) {
      records.sort((a, b) => a.spec.version - b.spec.version);
      const versions = new Set<number>();
      for (const record of records) {
        if (versions.has(record.spec.version)) {
          throw new Error(`Duplicate version ${record.spec.version} for metric ${name}`);
        }
        versions.add(record.spec.version);
      }
    }
    this.specCache = metrics;
    return metrics;
  }

  listMetricNames(): string[] {
    return Array.from(this.load().keys()).sort();
  }

  getSpec(metricName: string, version?: number): MetricSpec {
    const records = this.load().get(metricName);
    if (!records || records.length === 0) {
      throw new Error(`Metric ${metricName} not found in registry`);
    }
    if (version !== undefined) {
      const record = records.find(entry => entry.spec.version === version);
      if (!record) {
        throw new Error(`Metric ${metricName} does not have version ${version}`);
      }
      return record.spec;
    }
    return records[records.length - 1].spec;
  }

  compileMetric(spec: MetricSpec, dialect: Dialect): CompiledArtifactSet {
    return {
      view: renderViewSql(spec, dialect),
      udf: renderUdfSql(spec, dialect)
    };
  }

  compileAll(dialect: Dialect, metricName?: string): Record<string, CompiledArtifactSet> {
    const results: Record<string, CompiledArtifactSet> = {};
    if (metricName) {
      results[metricName] = this.compileMetric(this.getSpec(metricName), dialect);
      return results;
    }
    for (const name of this.listMetricNames()) {
      results[name] = this.compileMetric(this.getSpec(name), dialect);
    }
    return results;
  }

  writeCompiledArtifacts(dialect: Dialect, metricName?: string): string[] {
    const compiled = this.compileAll(dialect, metricName);
    const written: string[] = [];
    for (const [name, artifacts] of Object.entries(compiled)) {
      const baseDir = path.join(this.outputRoot, dialect, name);
      const viewPath = path.join(baseDir, 'view.sql');
      const udfPath = path.join(baseDir, 'udf.sql');
      if (writeFileIfChanged(viewPath, artifacts.view)) {
        written.push(viewPath);
      }
      if (writeFileIfChanged(udfPath, artifacts.udf)) {
        written.push(udfPath);
      }
      const manifestPath = path.join(baseDir, 'spec.json');
      const spec = this.getSpec(name);
      writeFileIfChanged(manifestPath, canonicalizeSpec(spec));
    }
    return written;
  }

  diff(metricName: string, leftVersion: number, rightVersion: number): string {
    const left = this.getSpec(metricName, leftVersion);
    const right = this.getSpec(metricName, rightVersion);
    const diff = diffLines(canonicalizeSpec(left), canonicalizeSpec(right));
    const lines: string[] = [];
    for (const part of diff) {
      const prefix = part.added ? '+' : part.removed ? '-' : ' ';
      const value = part.value.replace(/\n$/, '');
      const splitted = value.split('\n');
      for (const line of splitted) {
        if (line.length === 0) {
          continue;
        }
        lines.push(`${prefix} ${line}`);
      }
    }
    return lines.join('\n');
  }

  runConformance(dialect: Dialect, metricName?: string): string[] {
    const compiled = this.compileAll(dialect, metricName);
    const failures: string[] = [];
    for (const [name, artifacts] of Object.entries(compiled)) {
      const baseDir = path.join(this.goldenRoot, dialect, name);
      const viewGoldenPath = path.join(baseDir, 'view.sql');
      const udfGoldenPath = path.join(baseDir, 'udf.sql');
      if (!fs.existsSync(viewGoldenPath) || !fs.existsSync(udfGoldenPath)) {
        failures.push(
          `Missing golden outputs for ${dialect}/${name}. Expected ${viewGoldenPath} and ${udfGoldenPath}.`
        );
        continue;
      }
      const viewGolden = fs.readFileSync(viewGoldenPath, 'utf8').trim();
      const udfGolden = fs.readFileSync(udfGoldenPath, 'utf8').trim();
      if (viewGolden !== artifacts.view.trim()) {
        failures.push(`View mismatch for ${dialect}/${name}`);
      }
      if (udfGolden !== artifacts.udf.trim()) {
        failures.push(`UDF mismatch for ${dialect}/${name}`);
      }
    }
    return failures;
  }

  exportGoldenFixtures(dialect: Dialect, metricName?: string): string[] {
    const compiled = this.compileAll(dialect, metricName);
    const written: string[] = [];
    for (const [name, artifacts] of Object.entries(compiled)) {
      const baseDir = path.join(this.goldenRoot, dialect, name);
      ensureDir(baseDir);
      const viewPath = path.join(baseDir, 'view.sql');
      const udfPath = path.join(baseDir, 'udf.sql');
      fs.writeFileSync(viewPath, artifacts.view.trim() + '\n', 'utf8');
      fs.writeFileSync(udfPath, artifacts.udf.trim() + '\n', 'utf8');
      written.push(viewPath, udfPath);
    }
    return written;
  }
}
