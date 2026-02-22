import { Request, Response } from 'express';
import { FunnelService } from './FunnelService.js';
import { Funnel } from './types.js';
import path from 'path';

const LOG_DIR = process.env.TELEMETRY_LOG_DIR || path.join(process.cwd(), 'logs', 'telemetry');
const service = new FunnelService(LOG_DIR);

export const createFunnel = (req: Request, res: Response) => {
    const funnel: Funnel = req.body;
    if (!funnel.id || !funnel.steps || funnel.steps.length === 0) {
        return res.status(400).json({ error: 'Invalid funnel' });
    }
    service.createFunnel(funnel);
    res.status(201).json(funnel);
};

export const getFunnelReport = (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        const report = service.generateReport(id);
        res.json(report);
    } catch (e: any) {
        res.status(404).json({ error: (e as Error).message });
    }
};
