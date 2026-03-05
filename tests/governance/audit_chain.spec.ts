import fs from 'fs';
import { AuditLogger } from '../../src/governance/audit/logger.js';

describe('Audit Chain', () => {
    const testFile = 'test_audit.json';

    afterEach(() => {
        if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    });

    it('should maintain hash chain across multiple logs', () => {
        const logger = new AuditLogger(testFile);
        const hash1 = logger.log({ id: 1, action: 'allow' });
        const hash2 = logger.log({ id: 2, action: 'deny' });

        const lines = fs.readFileSync(testFile, 'utf8').trim().split('\n');
        const log1 = JSON.parse(lines[0]);
        const log2 = JSON.parse(lines[1]);

        expect(log1.hash).toBe(hash1);
        expect(log2.previousHash).toBe(hash1);
        expect(log2.hash).toBe(hash2);
    });
});
