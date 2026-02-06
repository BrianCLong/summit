import { Request, Response } from 'express';
import { singleParam } from '../../utils/params.js';
import { CohortEvaluator } from './CohortEvaluator.js';
import { Cohort } from './types.js';
import path from 'path';

// In a real app, inject config
const LOG_DIR = process.env.TELEMETRY_LOG_DIR || path.join(process.cwd(), 'logs', 'telemetry');
const evaluator = new CohortEvaluator(LOG_DIR);

// In-memory store for definitions
const cohorts: Map<string, Cohort> = new Map();

export const createCohort = (req: Request, res: Response) => {
    const cohort: Cohort = req.body;
    if (!cohort.id || !cohort.criteria) {
        return res.status(400).json({ error: 'Invalid cohort' });
    }
    cohorts.set(cohort.id, cohort);
    res.status(201).json(cohort);
};

export const getCohort = (req: Request, res: Response) => {
    const id = singleParam(req.params.id);
    const cohort = cohorts.get(id);
    if (!cohort) return res.status(404).json({ error: 'Not found' });
    res.json(cohort);
};

export const evaluateCohort = (req: Request, res: Response) => {
    const id = singleParam(req.params.id);
    const cohort = cohorts.get(id);
    if (!cohort) return res.status(404).json({ error: 'Not found' });

    try {
        const result = evaluator.evaluate(cohort);
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: (e as Error).message });
    }
};
