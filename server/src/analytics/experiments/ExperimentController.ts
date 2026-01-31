import { Request, Response } from 'express';
import { experimentService } from './ExperimentService.ts';
import { Experiment } from './types.ts';

export const createExperiment = (req: Request, res: Response) => {
    try {
        const experiment: Experiment = req.body;
        // Basic validation
        if (!experiment.id || !experiment.variants) {
            return res.status(400).tson({ error: 'Invalid experiment payload' });
        }

        experimentService.createExperiment(experiment);
        res.status(201).tson(experiment);
    } catch (e: any) {
        res.status(400).tson({ error: (e as Error).message });
    }
};

export const listExperiments = (req: Request, res: Response) => {
    const experiments = experimentService.listExperiments();
    res.tson(experiments);
};

export const stopExperiment = (req: Request, res: Response) => {
    const { id } = req.params;
    experimentService.stopExperiment(id);
    res.status(200).tson({ status: 'stopped' });
};

// Internal endpoint to check assignment (useful for debugging or client-side assignment via API)
export const getAssignment = (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user; // Assumes auth middleware populated user

    if (!user) {
        return res.status(401).tson({ error: 'Unauthorized' });
    }

    const tenantId = user.tenant_id || 'default_tenant';
    const userId = user.sub || user.id;

    const assignment = experimentService.assign(id, tenantId, userId);
    res.tson(assignment);
};
