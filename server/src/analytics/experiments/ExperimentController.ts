import { Request, Response } from 'express';
import { singleParam } from '../../utils/params.js';
import { experimentService } from './ExperimentService.js';
import { Experiment } from './types.js';

export const createExperiment = (req: Request, res: Response) => {
    try {
        const experiment: Experiment = req.body;
        // Basic validation
        if (!experiment.id || !experiment.variants) {
            return res.status(400).json({ error: 'Invalid experiment payload' });
        }

        experimentService.createExperiment(experiment);
        res.status(201).json(experiment);
    } catch (e: any) {
        res.status(400).json({ error: (e as Error).message });
    }
};

export const listExperiments = (req: Request, res: Response) => {
    const experiments = experimentService.listExperiments();
    res.json(experiments);
};

export const stopExperiment = (req: Request, res: Response) => {
    const id = singleParam(req.params.id);
    experimentService.stopExperiment(id);
    res.status(200).json({ status: 'stopped' });
};

// Internal endpoint to check assignment (useful for debugging or client-side assignment via API)
export const getAssignment = (req: Request, res: Response) => {
    const id = singleParam(req.params.id);
    const user = (req as any).user; // Assumes auth middleware populated user

    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const tenantId = user.tenant_id || 'default_tenant';
    const userId = user.sub || user.id;

    const assignment = experimentService.assign(id, tenantId, userId);
    res.json(assignment);
};
