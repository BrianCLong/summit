
import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const BACKUP_ROOT = path.join(process.cwd(), 'backups');

describe('Resilience & Recovery Verification', () => {

    // Ensure clean state
    if (fs.existsSync(BACKUP_ROOT)) {
        fs.rmSync(BACKUP_ROOT, { recursive: true, force: true });
    }

    it('1. Should create a backup successfully', () => {
        try {
            execSync('npx tsx scripts/backup.ts', { stdio: 'pipe' });
        } catch (e: any) {
            console.error(e.stdout?.toString());
            console.error(e.stderr?.toString());
            throw e;
        }

        const backups = fs.readdirSync(BACKUP_ROOT);
        assert.ok(backups.length > 0, 'Backup directory should not be empty');

        const backupDir = path.join(BACKUP_ROOT, backups[0]);
        assert.ok(fs.existsSync(path.join(backupDir, 'manifest.json')), 'Manifest should exist');
        assert.ok(fs.existsSync(path.join(backupDir, 'postgres_dump.sql')), 'Postgres dump should exist');
    });

    it('2. Should restore from a valid backup', () => {
        const backups = fs.readdirSync(BACKUP_ROOT);
        const backupId = backups[0];

        try {
            execSync(`npx tsx scripts/restore.ts ${backupId}`, { stdio: 'pipe' });
        } catch (e: any) {
             console.error(e.stdout?.toString());
             console.error(e.stderr?.toString());
             throw e;
        }
    });

    it('3. Should pass integrity checks in DR drill', () => {
         try {
            execSync(`npx tsx scripts/dr/drill.ts integrity`, { stdio: 'pipe' });
        } catch (e: any) {
             assert.fail('Drill failed');
        }
    });

    it('4. Chaos injector should run without crashing process', () => {
        try {
            // Short CPU spike
            execSync(`npx tsx scripts/chaos/inject-fault.ts cpu-spike api 100`, { stdio: 'pipe' });
        } catch (e: any) {
             assert.fail('Chaos injection failed');
        }
    });
});
