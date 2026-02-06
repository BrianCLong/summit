
import { PartitionMaintenanceService } from '../src/services/PartitionMaintenanceService.js';
import { BackupService } from '../src/backup/BackupService.js';
import { RestoreService } from '../src/backup/RestoreService.js';
import path from 'path';
import fs from 'fs';

// Helper to suppress logger output during verification
// We rely on checking side effects
const noop = () => {};
// We can't easily mock the logger module without a loader, so we just accept the logs.

async function verifyPartitionMaintenance() {
    console.log('--- Verifying PartitionMaintenanceService ---');

    const mockPool = {
        read: async (query: string, params: any[]) => {
            console.log(`[DB Read] Query: ${query.replace(/\s+/g, ' ').substring(0, 50)}... Params: ${JSON.stringify(params)}`);
            // Return exists: false to trigger creation
            return { rows: [{ exists: false }] };
        },
        write: async (query: string) => {
             console.log(`[DB Write] ${query.replace(/\s+/g, ' ').trim()}`);
        }
    };

    const service = new PartitionMaintenanceService();
    // Inject mock pool
    await service.maintainPartitions(mockPool);
    console.log('Partition verification complete.\n');
}

async function verifyBackupService() {
    console.log('--- Verifying BackupService (Redis) ---');

    const mockRedisClient = {
        config: async (cmd: string, key: string) => {
            if (key === 'dir') return [null, '/tmp'];
            if (key === 'dbfilename') return [null, 'dump.rdb'];
            return [];
        },
        bgsave: async () => 'OK',
        info: async () => 'rdb_bgsave_in_progress:0',
        lpush: async () => 1,
        ltrim: async () => 'OK',
        constructor: { name: 'Redis' } // Standalone
    };

    const mockRedisService = {
        getClient: () => mockRedisClient,
        getInstance: () => mockRedisService // For consistency if called statically
    } as any;

    const service = new BackupService('/tmp/backup-test', mockRedisService);

    // Create dummy RDB file
    if (!fs.existsSync('/tmp')) fs.mkdirSync('/tmp');
    fs.writeFileSync('/tmp/dump.rdb', 'dummy rdb content');

    try {
        const file = await service.backupRedis();
        console.log(`Backup success: ${file}`);
        if (fs.existsSync(file)) {
            console.log('Backup file exists.');
            // Cleanup
            fs.unlinkSync(file);
        } else {
            console.error('Backup file NOT created.');
            process.exit(1);
        }
    } catch (e) {
        console.error('Backup failed:', e);
        process.exit(1);
    }

    // Cleanup source
    fs.unlinkSync('/tmp/dump.rdb');
    console.log('Backup verification complete.\n');
}

async function verifyRestoreService() {
     console.log('--- Verifying RestoreService (Redis) ---');

    const mockRedisClient = {
        config: async (cmd: string, key: string) => {
            if (key === 'dir') return [null, '/tmp'];
            if (key === 'dbfilename') return [null, 'restored.rdb'];
            return [];
        },
        constructor: { name: 'Redis' }
    };

    const mockRedisService = {
        getClient: () => mockRedisClient
    } as any;

    const service = new RestoreService(mockRedisService);

    const backupFile = '/tmp/backup-to-restore.rdb';
    fs.writeFileSync(backupFile, 'data to restore');

    try {
        await service.restoreRedis(backupFile);
        console.log('Restore executed.');
        if (fs.existsSync('/tmp/restored.rdb')) {
             console.log('Target file exists.');
             const content = fs.readFileSync('/tmp/restored.rdb', 'utf8');
             if (content === 'data to restore') {
                 console.log('Content verified.');
             } else {
                 console.error('Content mismatch.');
                 process.exit(1);
             }
             fs.unlinkSync('/tmp/restored.rdb');
        } else {
            console.error('Target file NOT created.');
            process.exit(1);
        }
    } catch (e) {
        console.error('Restore failed:', e);
        process.exit(1);
    }

    fs.unlinkSync(backupFile);
    console.log('Restore verification complete.\n');
}

async function run() {
    await verifyPartitionMaintenance();
    await verifyBackupService();
    await verifyRestoreService();
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
