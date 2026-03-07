import { allowedColors, allowedSpacing } from "./tokens";

export type TelemetryEvent = {
  component: string;
  version: string;
  context?: Record<string, unknown>;
  drift?: { field: string; value: unknown; allowed: (string | number)[] }[];
  timestamp: number;
};

export interface TelemetryTransport {
  send: (events: TelemetryEvent[]) => Promise<void>;
}

export class BeaconTransport implements TelemetryTransport {
  constructor(private endpoint: string = "/api/ux-telemetry") {}

  async send(events: TelemetryEvent[]): Promise<void> {
    const payload = JSON.stringify({ events });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(this.endpoint, payload);
      return;
    }

    await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
  }
}

export type TelemetryOptions = {
  autoFlushMs?: number | null;
};

export class DesignSystemTelemetry {
  private buffer: TelemetryEvent[] = [];
  private flushInterval?: ReturnType<typeof setInterval>;

  constructor(
    private transport: TelemetryTransport = new BeaconTransport(),
    options: TelemetryOptions = {}
  ) {
    const interval = options.autoFlushMs ?? 5000;
    if (interval !== null) {
      this.flushInterval = setInterval(() => this.flush(), interval);
    }
  }

  record(component: string, version: string, context?: Record<string, unknown>) {
    this.buffer.push({ component, version, context, timestamp: Date.now() });
  }

  recordDrift(
    component: string,
    version: string,
    field: string,
    value: unknown,
    allowed: (string | number)[]
  ) {
    this.buffer.push({
      component,
      version,
      timestamp: Date.now(),
      drift: [{ field, value, allowed }],
    });
  }

  validateStyle(component: string, version: string, styles: Record<string, unknown>) {
    Object.entries(styles).forEach(([key, value]) => {
      if (typeof value === "string" && value.startsWith("#") && !allowedColors.has(value)) {
        this.recordDrift(component, version, key, value, Array.from(allowedColors));
      }
      if (
        typeof value === "number" &&
        key.toLowerCase().includes("padding") &&
        !allowedSpacing.has(value)
      ) {
        this.recordDrift(component, version, key, value, Array.from(allowedSpacing));
      }
    });
  }

  async flush() {
    if (!this.buffer.length) return;
    const snapshot = [...this.buffer];
    this.buffer = [];
    await this.transport.send(snapshot);
  }

  dispose() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }
}

export const globalTelemetry = new DesignSystemTelemetry();
