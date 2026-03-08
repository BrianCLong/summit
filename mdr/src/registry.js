"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricRegistry = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const diff_1 = require("diff");
const loader_1 = require("./loader");
const generators_1 = require("./sql/generators");
const utils_1 = require("./utils");
class MetricRegistry {
    specsRoot;
    outputRoot;
    goldenRoot;
    specCache;
    constructor(options = {}) {
        this.specsRoot = options.specsRoot ?? path_1.default.resolve(process.cwd(), 'specs');
        this.outputRoot = options.outputRoot ?? path_1.default.resolve(process.cwd(), 'dist');
        this.goldenRoot = options.goldenRoot ?? path_1.default.resolve(process.cwd(), 'golden');
    }
    load() {
        if (this.specCache) {
            return this.specCache;
        }
        const files = (0, loader_1.discoverSpecFiles)(this.specsRoot);
        const metrics = new Map();
        for (const file of files) {
            const record = (0, loader_1.loadSpecFromFile)(file);
            const entries = metrics.get(record.spec.name) ?? [];
            entries.push(record);
            metrics.set(record.spec.name, entries);
        }
        for (const [name, records] of metrics.entries()) {
            records.sort((a, b) => a.spec.version - b.spec.version);
            const versions = new Set();
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
    listMetricNames() {
        return Array.from(this.load().keys()).sort();
    }
    getSpec(metricName, version) {
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
    compileMetric(spec, dialect) {
        return {
            view: (0, generators_1.renderViewSql)(spec, dialect),
            udf: (0, generators_1.renderUdfSql)(spec, dialect)
        };
    }
    compileAll(dialect, metricName) {
        const results = {};
        if (metricName) {
            results[metricName] = this.compileMetric(this.getSpec(metricName), dialect);
            return results;
        }
        for (const name of this.listMetricNames()) {
            results[name] = this.compileMetric(this.getSpec(name), dialect);
        }
        return results;
    }
    writeCompiledArtifacts(dialect, metricName) {
        const compiled = this.compileAll(dialect, metricName);
        const written = [];
        for (const [name, artifacts] of Object.entries(compiled)) {
            const baseDir = path_1.default.join(this.outputRoot, dialect, name);
            const viewPath = path_1.default.join(baseDir, 'view.sql');
            const udfPath = path_1.default.join(baseDir, 'udf.sql');
            if ((0, utils_1.writeFileIfChanged)(viewPath, artifacts.view)) {
                written.push(viewPath);
            }
            if ((0, utils_1.writeFileIfChanged)(udfPath, artifacts.udf)) {
                written.push(udfPath);
            }
            const manifestPath = path_1.default.join(baseDir, 'spec.json');
            const spec = this.getSpec(name);
            (0, utils_1.writeFileIfChanged)(manifestPath, (0, utils_1.canonicalizeSpec)(spec));
        }
        return written;
    }
    diff(metricName, leftVersion, rightVersion) {
        const left = this.getSpec(metricName, leftVersion);
        const right = this.getSpec(metricName, rightVersion);
        const diff = (0, diff_1.diffLines)((0, utils_1.canonicalizeSpec)(left), (0, utils_1.canonicalizeSpec)(right));
        const lines = [];
        for (const part of diff) {
            let prefix = ' ';
            if (part.added) {
                prefix = '+';
            }
            else if (part.removed) {
                prefix = '-';
            }
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
    runConformance(dialect, metricName) {
        const compiled = this.compileAll(dialect, metricName);
        const failures = [];
        for (const [name, artifacts] of Object.entries(compiled)) {
            const baseDir = path_1.default.join(this.goldenRoot, dialect, name);
            const viewGoldenPath = path_1.default.join(baseDir, 'view.sql');
            const udfGoldenPath = path_1.default.join(baseDir, 'udf.sql');
            if (!fs_1.default.existsSync(viewGoldenPath) || !fs_1.default.existsSync(udfGoldenPath)) {
                failures.push(`Missing golden outputs for ${dialect}/${name}. Expected ${viewGoldenPath} and ${udfGoldenPath}.`);
                continue;
            }
            const viewGolden = fs_1.default.readFileSync(viewGoldenPath, 'utf8').trim();
            const udfGolden = fs_1.default.readFileSync(udfGoldenPath, 'utf8').trim();
            if (viewGolden !== artifacts.view.trim()) {
                failures.push(`View mismatch for ${dialect}/${name}`);
            }
            if (udfGolden !== artifacts.udf.trim()) {
                failures.push(`UDF mismatch for ${dialect}/${name}`);
            }
        }
        return failures;
    }
    exportGoldenFixtures(dialect, metricName) {
        const compiled = this.compileAll(dialect, metricName);
        const written = [];
        for (const [name, artifacts] of Object.entries(compiled)) {
            const baseDir = path_1.default.join(this.goldenRoot, dialect, name);
            (0, utils_1.ensureDir)(baseDir);
            const viewPath = path_1.default.join(baseDir, 'view.sql');
            const udfPath = path_1.default.join(baseDir, 'udf.sql');
            fs_1.default.writeFileSync(viewPath, `${artifacts.view.trim()}\n`, 'utf8');
            fs_1.default.writeFileSync(udfPath, `${artifacts.udf.trim()}\n`, 'utf8');
            written.push(viewPath, udfPath);
        }
        return written;
    }
}
exports.MetricRegistry = MetricRegistry;
