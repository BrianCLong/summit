
import { RequestHandler } from 'express';

export class OpaController {
  checkPolicy: RequestHandler = async (req, res) => {
    const { input } = req.body;
    res.json({ result: true, decision_id: 'dec-123' });
  };

  updatePolicy: RequestHandler = async (req, res) => {
    const { policy } = req.body;
    res.json({ success: true, version: 'v2' });
  };
}
