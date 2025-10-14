import { Detector, defaultDetector } from './detectors';
import { ProcessedTelemetryEvent } from './client-types';

export interface VerificationViolation {
  event: string;
  path: string;
  message: string;
}

export interface VerificationResult {
  valid: boolean;
  violations: VerificationViolation[];
}

const REDACTED_VALUE = '[REDACTED]';

const getValueAtPath = (attributes: Record<string, unknown>, path: string): unknown => {
  const segments = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let current: unknown = attributes;
  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (Array.isArray(current)) {
      const index = Number(segment);
      current = Number.isNaN(index) ? undefined : current[index];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
};

const traverse = (
  value: unknown,
  path: string,
  visit: (path: string, leaf: string) => void,
): void => {
  if (value === null || value === undefined) {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => traverse(item, `${path}[${index}]`, visit));
    return;
  }
  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) =>
      traverse(child, path ? `${path}.${key}` : key, visit),
    );
    return;
  }
  if (typeof value === 'string') {
    visit(path, value);
  }
};

export class TelemetryVerifier {
  constructor(private readonly detector: Detector = defaultDetector) {}

  verify(events: ProcessedTelemetryEvent[]): VerificationResult {
    const violations: VerificationViolation[] = [];

    for (const event of events) {
      const redactionEntries = event.metadata.redactionMap;

      for (const dropped of event.metadata.droppedFields) {
        const value = getValueAtPath(event.attributes, dropped);
        if (value !== undefined) {
          violations.push({
            event: event.name,
            path: dropped,
            message: 'denied field still present',
          });
        }
      }

      Object.entries(redactionEntries).forEach(([path, entry]) => {
        const value = getValueAtPath(event.attributes, path as string);
        switch (entry.action) {
          case 'redact':
            if (value !== REDACTED_VALUE) {
              violations.push({ event: event.name, path, message: 'redacted field not sanitized' });
            }
            break;
          case 'hash':
            if (typeof value !== 'string' || !value.startsWith('hash:')) {
              violations.push({ event: event.name, path, message: 'hashed field missing hash prefix' });
            }
            break;
          case 'deny':
            if (value !== undefined) {
              violations.push({ event: event.name, path, message: 'denied field serialized' });
            }
            break;
          default:
            break;
        }
      });

      traverse(event.attributes, '', (path, value) => {
        const findings = this.detector.detect(value);
        if (findings.length > 0) {
          const entry = redactionEntries[path];
          if (!entry || (entry.action !== 'redact' && entry.action !== 'hash' && entry.action !== 'deny')) {
            violations.push({
              event: event.name,
              path,
              message: 'pii detected without protective action',
            });
          }
        }
      });
    }

    return { valid: violations.length === 0, violations };
  }
}
