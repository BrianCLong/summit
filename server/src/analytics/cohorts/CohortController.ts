
import { RequestHandler } from 'express';

export class CohortController {
  createCohort: RequestHandler = async (req, res) => {
    const { name, criteria } = req.body;
    res.json({ id: 'cohort-1', name, criteria });
  };

  getCohort: RequestHandler = async (req, res) => {
    const { id } = req.params;
    res.json({ id, name: 'Sample Cohort', users: 100 });
  };
}
