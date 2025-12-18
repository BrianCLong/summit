type TelemetryPayload = Record<string, unknown>;

export class TelemetryGuard {
  analyticsEnabled: boolean;

  constructor() {
    const blocked = process.env.A11Y_LAB_ALLOW_ANALYTICS !== 'true';
    this.analyticsEnabled = !blocked;
  }

  enforceNoAnalytics() {
    if (!this.analyticsEnabled) {
      return;
    }
    this.analyticsEnabled = false;
  }

  blockContentAnalytics(data?: { violations?: unknown }) {
    if (this.analyticsEnabled) {
      this.analyticsEnabled = false;
    }
    if (data && 'violations' in (data as TelemetryPayload)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (data as TelemetryPayload).violations;
    }
  }

  sanitizePayload(payload: TelemetryPayload): TelemetryPayload {
    const sanitized: TelemetryPayload = {};
    Object.entries(payload).forEach(([key, value]) => {
      if (typeof value === 'string') {
        sanitized[key] = this.redact(value);
      } else {
        sanitized[key] = value;
      }
    });
    return sanitized;
  }

  private redact(value: string): string {
    return value.replace(/[A-Za-z0-9]{3,}@/g, '[redacted-email]');
  }
}
