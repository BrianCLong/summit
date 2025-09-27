import { CompositeDetector, Detector, DetectorFinding, defaultDetector } from './detectors';
import { OfflineBatcher } from './batcher';
import {
  ProcessedTelemetryEvent,
  RecordResult,
  RedactionEntry,
  TelemetryEventInput,
  TelemetryMetadata,
} from './client-types';
import { PolicyConfig, PolicyDecision, PolicyEngine, PolicyPlugin, createPolicyPipeline } from './policies';

export interface TelemetryClientConfig {
  detectors?: Detector[];
  plugins?: PolicyPlugin[];
  policyConfig?: PolicyConfig;
  sampleRate?: number;
  batchSize?: number;
  random?: () => number;
}

const REDACTED_VALUE = '[REDACTED]';

const fnv1a = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
    hash >>>= 0;
  }
  return `hash:${hash.toString(16)}`;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]';

const joinPath = (prefix: string, key: string): string => (prefix ? `${prefix}.${key}` : key);

export class TelemetryClient {
  private readonly detector: Detector;

  private readonly policy: PolicyEngine;

  private readonly batcher: OfflineBatcher;

  private readonly sampleRate: number;

  private readonly random: () => number;

  constructor(config: TelemetryClientConfig = {}) {
    this.detector = config.detectors
      ? new CompositeDetector(config.detectors)
      : config.plugins
        ? new CompositeDetector([defaultDetector])
        : defaultDetector;
    this.policy = config.plugins
      ? new PolicyEngine(config.plugins, config.policyConfig?.defaultAction ?? 'allow')
      : createPolicyPipeline(config.policyConfig);
    this.sampleRate = Math.min(Math.max(config.sampleRate ?? 1, 0), 1);
    this.random = config.random ?? Math.random;
    this.batcher = new OfflineBatcher(config.batchSize ?? 50);
  }

  record(event: TelemetryEventInput): RecordResult {
    const sampled = this.random() <= this.sampleRate;
    if (!sampled) {
      return { accepted: false, reason: 'sampled_out' };
    }

    const metadata: TelemetryMetadata = {
      redactionMap: {},
      droppedFields: [],
      sampleRate: this.sampleRate,
      sampled: true,
    };

    const { value: sanitized, blocked } = this.processNode(event.attributes, '', metadata);

    if (blocked) {
      metadata.blocked = true;
      return { accepted: false, reason: 'denied' };
    }

    const processed: ProcessedTelemetryEvent = {
      name: event.name,
      timestamp: event.timestamp ?? Date.now(),
      attributes: sanitized as Record<string, unknown>,
      metadata,
    };

    this.batcher.enqueue(processed);

    return { accepted: true, event: processed };
  }

  flush(): ProcessedTelemetryEvent[] {
    return this.batcher.flush();
  }

  pending(): number {
    return this.batcher.size();
  }

  private processNode(
    node: unknown,
    path: string,
    metadata: TelemetryMetadata,
  ): { value: unknown; blocked: boolean } {
    if (Array.isArray(node)) {
      const result: unknown[] = [];
      for (let i = 0; i < node.length; i += 1) {
        const itemPath = `${path}[${i}]`;
        const { value, blocked } = this.processNode(node[i], itemPath, metadata);
        if (blocked) {
          return { value: [], blocked: true };
        }
        if (value !== undefined) {
          result.push(value);
        }
      }
      return { value: result, blocked: false };
    }

    if (node === null || node === undefined) {
      return { value: node, blocked: false };
    }

    if (isPlainObject(node)) {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node)) {
        const childPath = joinPath(path, key);
        const { value: childValue, blocked } = this.processNode(value, childPath, metadata);
        if (blocked) {
          return { value: {}, blocked: true };
        }
        if (childValue !== undefined) {
          result[key] = childValue;
        }
      }
      return { value: result, blocked: false };
    }

    return this.processLeaf(node, path, metadata);
  }

  private processLeaf(
    value: unknown,
    path: string,
    metadata: TelemetryMetadata,
  ): { value: unknown; blocked: boolean } {
    const stringValue = typeof value === 'string' ? value : undefined;
    const findings: DetectorFinding[] = stringValue ? this.detector.detect(stringValue) : [];
    const decision: PolicyDecision = this.policy.decide(path, value, findings);

    const entry: RedactionEntry | undefined = findings.length
      ? { action: decision.action, reason: decision.reason, findings }
      : decision.action !== 'allow'
        ? { action: decision.action, reason: decision.reason }
        : undefined;

    if (entry) {
      metadata.redactionMap[path] = entry;
    }

    switch (decision.action) {
      case 'allow':
        return { value, blocked: false };
      case 'redact': {
        const sanitized = REDACTED_VALUE;
        metadata.redactionMap[path] = { ...entry, action: 'redact', findings };
        return { value: sanitized, blocked: false };
      }
      case 'hash': {
        const hashed = stringValue ? fnv1a(stringValue) : fnv1a(String(value));
        metadata.redactionMap[path] = {
          ...entry,
          action: 'hash',
          hashPreview: hashed.slice(0, 12),
          findings,
        };
        return { value: hashed, blocked: false };
      }
      case 'deny':
        metadata.redactionMap[path] = { ...entry, action: 'deny', findings };
        metadata.droppedFields.push(path);
        if (decision.blockEvent) {
          return { value: undefined, blocked: true };
        }
        return { value: undefined, blocked: false };
      default:
        return { value, blocked: false };
    }
  }
}
