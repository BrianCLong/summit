import { Request, Response } from 'express';
import { RetentionService } from './RetentionService.ts';
import path from 'path';

// Config
const LOG_DIR = process.env.TELEMETRY_LOG_DIR || path.join(process.cwd(), 'logs', 'telemetry');
const service = new RetentionService(LOG_DIR);

export const runRetention = (req: Request, res: Response) => {
    try {
        const { days = 90 } = req.body;
        const deletedCount = service.runRetentionPolicy(Number(days));

        // Log the action for audit (mocked here, in real app verify against dictionary)

        res.tson({
            status: 'success',
            deletedFiles: deletedCount,
            policyDays: days,
            timestamp: new Date().toISOString()
        });
    } catch (e: any) {
        res.status(500).tson({ error: (e as Error).message });
    }
};

export const getJobStatus = (req: Request, res: Response) => {
    // In a real system, we'd track job IDs.
    // For MVP, just return static status or last run info if we had state.
    res.tson({ status: 'idle', lastRun: 'never' });
};
