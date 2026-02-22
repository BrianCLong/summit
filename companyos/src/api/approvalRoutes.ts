import { Router } from 'express';
import { ApprovalService } from '../services/approvalService';

export function createApprovalRoutes(approvalService: ApprovalService): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    try {
      const approval = await approvalService.createApproval(req.body);
      res.status(201).json(approval);
    } catch (error) {
      console.error('Error creating approval:', error);
      res.status(500).json({ error: 'Failed to create approval' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string;
      const approvals = await approvalService.listApprovals(tenantId);
      res.json(approvals);
    } catch (error) {
      console.error('Error listing approvals:', error);
      res.status(500).json({ error: 'Failed to list approvals' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const approval = await approvalService.getApproval(req.params.id);
      if (!approval) return res.status(404).json({ error: 'Approval not found' });
      res.json(approval);
    } catch (error) {
      console.error('Error getting approval:', error);
      res.status(500).json({ error: 'Failed to get approval' });
    }
  });

  router.patch('/:id', async (req, res) => {
    try {
      const { status, approverId, rationale } = req.body;
      const approval = await approvalService.decideApproval(req.params.id, status, approverId, rationale);
      if (!approval) return res.status(404).json({ error: 'Approval not found' });
      res.json(approval);
    } catch (error) {
      console.error('Error deciding approval:', error);
      res.status(500).json({ error: 'Failed to decide approval' });
    }
  });

  return router;
}
