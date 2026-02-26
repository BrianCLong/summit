
import { RequestHandler } from 'express';

export class ExperimentController {
  createExperiment: RequestHandler = async (req, res) => {
    const { name, variants } = req.body;
    res.json({ id: 'exp-1', name, variants, status: 'draft' });
  };

  getResults: RequestHandler = async (req, res) => {
    const { id } = req.params;
    res.json({ id, winner: 'variant-a', confidence: 0.95 });
  };
}
