import { Pool } from 'pg';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { createWriteStream, mkdirSync } from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import { getPostgresPool } from '../config/database.js';

export interface ArchivalResult {
    tier: 'COLD' | 'DEEP';
    bundlePath: string;
    recordCount: number;
    compressedSize: number;
}

export class AuditArchivingService {
    private static instance: AuditArchivingService;
    private db: Pool;
    private archiveRoot: string;

    private constructor() {
        this.db = getPostgresPool() as Pool;
        this.archiveRoot = path.join(process.cwd(), 'archive/audit');
        mkdirSync(this.archiveRoot, { recursive: true });
    }

    public static getInstance(): AuditArchivingService {
        if (!AuditArchivingService.instance) {
            AuditArchivingService.instance = new AuditArchivingService();
        }
        return AuditArchivingService.instance;
    }

    /**
     * Extracts and archives audit events within the specified date range.
     */
    public async archiveRange(startDate: Date, endDate: Date, tier: 'COLD' | 'DEEP'): Promise<ArchivalResult | null> {
        logger.info(`Starting audit archival for range ${startDate.toISOString()} - ${endDate.toISOString()} (Tier: ${tier})`);

        const bundleId = `audit_${tier.toLowerCase()}_${startDate.getTime()}_${endDate.getTime()}`;
        const bundlePath = path.join(this.archiveRoot, `${bundleId}.json.gz`);

        // 1. Fetch records from DB
        const query = `
            SELECT * FROM audit_events
            WHERE timestamp >= $1 AND timestamp < $2
        `;
        const result = await this.db.query(query, [startDate, endDate]);
        const recordCount = result.rowCount ?? 0;

        if (recordCount === 0) {
            logger.info('No records found for archival in this range.');
            return null;
        }

        // 2. Compress and write to "Cold Storage" (Mocking file-based archival)
        const jsonData = JSON.stringify(result.rows);
        const writeStream = createWriteStream(bundlePath);
        const gzip = createGzip();

        const readable = Readable.from([jsonData]);

        await pipeline(
            readable as any,
            gzip as any,
            writeStream as any
        );

        const stats = await import('fs/promises').then(fs => fs.stat(bundlePath));

        logger.info(`Archived ${recordCount} records to ${bundlePath} (${(stats.size / 1024).toFixed(2)} KB)`);

        return {
            tier,
            bundlePath,
            recordCount,
            compressedSize: stats.size
        };
    }
}

export const auditArchivingService = AuditArchivingService.getInstance();
