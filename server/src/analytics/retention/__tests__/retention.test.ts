import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { RetentionService } from '../RetentionService.ts';

const TEST_LOG_DIR = path.join(__dirname, 'test_logs_retention_' + Date.now());

describe('RetentionService', () => {
    let service: RetentionService;

    beforeEach(() => {
        if (fs.existsSync(TEST_LOG_DIR)) {
            fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(TEST_LOG_DIR, { recursive: true });
        service = new RetentionService(TEST_LOG_DIR);
    });

    afterEach(() => {
        if (fs.existsSync(TEST_LOG_DIR)) {
             try { fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true }); } catch (e: any) {}
        }
    });

    it('should delete old files', () => {
        // Create a file from 10 days ago
        const date = new Date();
        date.setDate(date.getDate() - 10);
        const dateStr = date.toISOString().split('T')[0];
        const oldFile = `telemetry-${dateStr}.tsonl`;
        fs.writeFileSync(path.join(TEST_LOG_DIR, oldFile), 'data');

        // Create a file from today
        const todayStr = new Date().toISOString().split('T')[0];
        const newFile = `telemetry-${todayStr}.tsonl`;
        fs.writeFileSync(path.join(TEST_LOG_DIR, newFile), 'data');

        // Keep 5 days
        const deleted = service.runRetentionPolicy(5);

        expect(deleted).toBe(1);
        expect(fs.existsSync(path.join(TEST_LOG_DIR, oldFile))).toBe(false);
        expect(fs.existsSync(path.join(TEST_LOG_DIR, newFile))).toBe(true);
    });
});
