import fs from 'fs';
import path from 'path';
import { TelemetryEvent, TelemetryConfig } from './types.ts';
import { TelemetryScrubber } from './scrubber.ts';
import crypto from 'crypto';

export class TelemetryService {
  private config: TelemetryConfig;
  private scrubber: TelemetryScrubber;
  private logStream: fs.WriteStream | null = null;
  private currentLogFile: string = '';
  private enabled: boolean;

  constructor(config: TelemetryConfig) {
    this.config = config;
    this.enabled = config.enabled ?? true;
    this.scrubber = new TelemetryScrubber(config.salt);
    if (this.enabled) {
      this.ensureLogDir();
      this.rotateLog();
    }
  }

  private ensureLogDir() {
    if (!fs.existsSync(this.config.logDir)) {
      console.log(`[TelemetryService] Creating log dir: ${this.config.logDir}`);
      fs.mkdirSync(this.config.logDir, { recursive: true });
    } else {
      console.log(`[TelemetryService] Log dir exists: ${this.config.logDir}`);
    }
  }

  private rotateLog() {
    const date = new Date().toISOString().split('T')[0];
    const filename = `telemetry-${date}.tsonl`;
    const filepath = path.join(this.config.logDir, filename);

    if (this.currentLogFile !== filepath) {
      console.log(`[TelemetryService] Rotating log to: ${filepath}`);
      if (this.logStream) {
        this.logStream.end();
      }
      this.currentLogFile = filepath;
      this.logStream = fs.createWriteStream(filepath, { flags: 'a' });
      this.logStream!.on('error', (err: any) => {
        console.error('[TelemetryService] Stream error:', err);
      });
      this.logStream!.on('open', (fd: any) => {
        console.log(`[TelemetryService] Stream opened for ${filepath}, fd: ${fd}`);
      });
    }
  }

  public track(
    eventType: string,
    rawTenantId: string,
    rawUserId: string,
    actorRole: string,
    props: Record<string, any>
  ): void {
    // 1. Hash identifiers
    const tenantIdHash = this.scrubber.hash(rawTenantId);
    const scopeHash = this.scrubber.hash(rawUserId);

    // 2. Scrub properties
    const cleanProps = this.scrubber.scrubProps(eventType, props);

    // 3. Construct Envelope
    const event: TelemetryEvent = {
      eventId: crypto.randomUUID(),
      tenantIdHash,
      scopeHash,
      actorRole,
      eventType,
      ts: new Date().toISOString(),
      props: cleanProps,
    };

    // 4. Write to storage
    this.writeEvent(event);
  }

  private writeEvent(event: TelemetryEvent) {
    if (!this.enabled) {
      return;
    }
    // Ensure we are writing to the correct day's log
    this.rotateLog();

    if (this.logStream) {
      const line = JSON.stringify(event) + '\n';
      // console.log(`[TelemetryService] Writing event: ${line.trim()}`);
      this.logStream.write(line);
    } else {
      console.error('[TelemetryService] No log stream available');
    }
  }
}

// Singleton instance
// In a real app, config would come from env vars
const config: TelemetryConfig = {
  salt: process.env.TELEMETRY_SALT || 'development_salt',
  logDir: process.env.TELEMETRY_LOG_DIR || path.join(process.cwd(), 'logs', 'telemetry'),
  enabled: process.env.DISABLE_TELEMETRY !== 'true',
};

export const telemetryService = new TelemetryService(config);
