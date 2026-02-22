import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { TelemetryScrubber } from '../scrubber.ts';
import { TelemetryService } from '../TelemetryService.ts';
import { ALLOWLIST } from '../allowlist.ts';

// Use a unique directory for this test run to avoid conflicts
const TEST_LOG_DIR = path.join(__dirname, 'test_logs_' + Date.now());
const SALT = 'test-salt';

describe('Telemetry Scrubber', () => {
  const scrubber = new TelemetryScrubber(SALT);

  it('should hash values deterministically', () => {
    const val = 'user-123';
    const hash1 = scrubber.hash(val);
    const hash2 = scrubber.hash(val);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(val);
  });

  it('should scrub PII from strings', () => {
    const props = {
      path: '/home',
      userAgent: 'Mozilla/5.0 ...',
      referrer: 'https://google.com',
      // Mocking 'duration' which is allowed
      duration: 'user@example.com', // Putting PII in an allowed field to test scrubbing
    };

    const scrubbed = scrubber.scrubProps('page_view', props);
    expect(scrubbed.duration).toBe('[REDACTED]');
    expect(scrubbed.path).toBe('/home');
  });

  it('should drop unknown properties', () => {
    const props = {
      path: '/home',
      secretField: 'secret-value',
    };
    const scrubbed = scrubber.scrubProps('page_view', props);
    expect(scrubbed.path).toBe('/home');
    expect(scrubbed.secretField).toBeUndefined();
  });
});

describe('Telemetry Service', () => {
  let service: TelemetryService;

  beforeEach(() => {
    if (fs.existsSync(TEST_LOG_DIR)) {
      fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
    }
    service = new TelemetryService({
      salt: SALT,
      logDir: TEST_LOG_DIR,
    });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_LOG_DIR)) {
       try {
        fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
       } catch (e: any) {
           console.error('Error cleaning up test logs:', e);
       }
    }
  });

  it('should write event to log file with hashed IDs and scrubbed props', async () => {
    const props = {
      path: '/api/resource',
      userAgent: 'Chrome/90',
      unknown: 'should-be-dropped'
    };

    // 'page_view' allows path, referrer, userAgent, duration
    service.track('page_view', 'tenant-1', 'user-1', 'admin', props);

    // Give it a moment for the file system to catch up if needed
    await new Promise(resolve => setTimeout(resolve, 500));

    const files = fs.readdirSync(TEST_LOG_DIR);
    console.log('Files in log dir:', files);

    expect(files.length).toBeGreaterThan(0);
    const content = fs.readFileSync(path.join(TEST_LOG_DIR, files[0]), 'utf-8');
    const event = JSON.parse(content.trim());

    expect(event.eventType).toBe('page_view');
    expect(event.tenantIdHash).not.toBe('tenant-1');
    expect(event.tenantIdHash).toBeDefined();
    expect(event.props.path).toBe('/api/resource');
    expect(event.props.unknown).toBeUndefined();
    expect(event.actorRole).toBe('admin');
  });
});
