import { Router } from 'express';
import express from 'express';
import {
  createPullRequest,
  listBranches,
} from '../../../services/proxy/src/integrations/github';

const router = Router();

// Create a pull request
router.post('/pull-requests', express.json(), async (req, res) => {
  try {
    const { title, body, head, base, draft, labels, assignees, targetRepo } =
      req.body;

    if (!title || !head) {
      return res
        .status(400)
        .json({ message: 'title and head branch are required' });
    }

    const result = await createPullRequest({
      title,
      body: body || '',
      head,
      base: base || 'main',
      draft: draft || false,
      labels: labels || [],
      assignees: assignees || [],
      targetRepo,
    });

    return res.status(201).json(result);
  } catch (error) {
    console.error('Failed to create pull request:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create pull request';
    return res.status(500).json({ message });
  }
});

// List branches
router.get('/branches', async (req, res) => {
  try {
    const repo = req.query.repo as string | undefined;
    const branches = await listBranches(repo);
    return res.json(branches);
  } catch (error) {
    console.error('Failed to list branches:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to list branches';
    return res.status(500).json({ message });
  }
});

export default router;
