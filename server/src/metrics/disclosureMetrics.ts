import { Counter, Gauge, Histogram, register } from 'prom-client';

export type DisclosureMetricEvent = 'start' | 'complete' | 'fail' | 'ui_view' | 'ui_start';

function getOrCreateCounter(name: string, config: ConstructorParameters<typeof Counter>[0]): Counter<string> {
  const existing = register.getSingleMetric(name);
  if (existing) return existing as Counter<string>;
  return new Counter(config);
}

function getOrCreateHistogram(name: string, config: ConstructorParameters<typeof Histogram>[0]): Histogram<string> {
  const existing = register.getSingleMetric(name);
  if (existing) return existing as Histogram<string>;
  return new Histogram(config);
}

function getOrCreateGauge(name: string, config: ConstructorParameters<typeof Gauge>[0]): Gauge<string> {
  const existing = register.getSingleMetric(name);
  if (existing) return existing as Gauge<string>;
  return new Gauge(config);
}

export class DisclosureMetrics {
  private static instance: DisclosureMetrics;

  private readonly events: Counter<string>;
  private readonly durations: Histogram<string>;
  private readonly bundleSize: Histogram<string>;
  private readonly activeExports: Gauge<string>;
  private readonly warningCounter: Counter<string>;

  private constructor() {
    this.events = getOrCreateCounter('disclosure_packager_events_total', {
      name: 'disclosure_packager_events_total',
      help: 'Lifecycle events recorded for the disclosure packager UI and API.',
      labelNames: ['event', 'tenant'],
    });

    this.durations = getOrCreateHistogram('disclosure_packager_duration_seconds', {
      name: 'disclosure_packager_duration_seconds',
      help: 'Observed export durations in seconds.',
      labelNames: ['tenant'],
      buckets: [5, 15, 30, 60, 90, 120, 180, 240, 300, 420],
    });

    this.bundleSize = getOrCreateHistogram('disclosure_packager_bundle_bytes', {
      name: 'disclosure_packager_bundle_bytes',
      help: 'Size of completed disclosure bundles in bytes.',
      labelNames: ['tenant'],
      buckets: [50_000, 250_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 25_000_000],
    });

    this.activeExports = getOrCreateGauge('disclosure_packager_active_exports', {
      name: 'disclosure_packager_active_exports',
      help: 'Number of disclosure exports currently executing.',
      labelNames: ['tenant'],
    });

    this.warningCounter = getOrCreateCounter('disclosure_packager_warnings_total', {
      name: 'disclosure_packager_warnings_total',
      help: 'Warnings surfaced while assembling disclosure bundles.',
      labelNames: ['tenant', 'type'],
    });
  }

  static getInstance(): DisclosureMetrics {
    if (!DisclosureMetrics.instance) {
      DisclosureMetrics.instance = new DisclosureMetrics();
    }
    return DisclosureMetrics.instance;
  }

  recordEvent(event: DisclosureMetricEvent, tenant: string): void {
    this.events.inc({ event, tenant });
  }

  exportStarted(tenant: string): void {
    this.recordEvent('start', tenant);
    this.activeExports.inc({ tenant });
  }

  exportCompleted(tenant: string, durationMs: number, bundleBytes: number, warningTypes: string[]): void {
    this.recordEvent('complete', tenant);
    this.activeExports.dec({ tenant });
    this.durations.observe({ tenant }, durationMs / 1000);
    this.bundleSize.observe({ tenant }, bundleBytes);
    const uniqueWarningTypes = Array.from(new Set(warningTypes));
    for (const type of uniqueWarningTypes) {
      this.warningCounter.inc({ tenant, type });
    }
  }

  exportFailed(tenant: string): void {
    this.recordEvent('fail', tenant);
    this.activeExports.dec({ tenant });
  }

  uiEvent(event: 'view' | 'start', tenant: string): void {
    const metricEvent: DisclosureMetricEvent = event === 'view' ? 'ui_view' : 'ui_start';
    this.recordEvent(metricEvent, tenant);
  }
}

export const disclosureMetrics = DisclosureMetrics.getInstance();
