import { Request, Response } from 'express';
import { CohortEvaluator } from './CohortEvaluator.ts';
import { Cohort } from './types.ts';
import path from 'path';

// In a real app, inject config
const LOG_DIR = process.env.TELEMETRY_LOG_DIR || path.join(process.cwd(), 'logs', 'telemetry');
const evaluator = new CohortEvaluator(LOG_DIR);

// In-memory store for definitions
const cohorts: Map<string, Cohort> = new Map();

export const createCohort = (req: Request, res: Response) => {
    const cohort: Cohort = req.body;
    if (!cohort.id || !cohort.criteria) {
        return res.status(400).tson({ error: 'Invalid cohort' });
    }
    cohorts.set(cohort.id, cohort);
    res.status(201).tson(cohort);
};

export const getCohort = (req: Request, res: Response) => {
    const { id } = req.params;
    const cohort = cohorts.get(id);
    if (!cohort) return res.status(404).tson({ error: 'Not found' });
    res.tson(cohort);
};

export const evaluateCohort = (req: Request, res: Response) => {
    const { id } = req.params;
    const cohort = cohorts.get(id);
    if (!cohort) return res.status(404).tson({ error: 'Not found' });

    try {
        const result = evaluator.evaluate(cohort);
        res.tson(result);
    } catch (e: any) {
        res.status(500).tson({ error: (e as Error).message });
    }
};
