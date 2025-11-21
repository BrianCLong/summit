import { Router, Request, Response } from 'express';
import express from 'express';
import { hmacHex, safeEqual } from '../utils/signature';
import { Octokit } from '@octokit/rest';

const router = Router();

// Initialize Octokit with GitHub token
const getOctokit = () => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN not configured');
  }
  return new Octokit({ auth: token });
};

// Parse owner/repo from repository string
const parseRepo = (repository: string) => {
  const parts = repository.split('/');
  if (parts.length !== 2) {
    throw new Error('Invalid repository format. Expected owner/repo');
  }
  return { owner: parts[0], repo: parts[1] };
};

// Webhook events handler
router.post(
  '/events',
  express.raw({ type: 'application/json', limit: '1mb' }),
  async (req, res) => {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) return res.status(503).send('webhook disabled');
    const sig = req.header('X-Hub-Signature-256') || '';
    const expected = 'sha256=' + hmacHex('sha256', secret, req.body as Buffer);
    if (!safeEqual(expected, sig)) return res.status(401).send('bad signature');

    // const payload = JSON.parse((req.body as Buffer).toString('utf8'));
    return res.status(200).send();
  },
);

// Create pull request
router.post('/pulls', async (req: Request, res: Response) => {
  try {
    const { repository, title, body, head, base, draft, reviewers, assignees } =
      req.body;

    if (!repository || !title || !head || !base) {
      return res.status(400).json({
        message: 'Missing required fields: repository, title, head, base',
      });
    }

    const octokit = getOctokit();
    const { owner, repo } = parseRepo(repository);

    // Create the pull request
    const { data: pr } = await octokit.pulls.create({
      owner,
      repo,
      title,
      body: body || '',
      head,
      base,
      draft: draft || false,
    });

    // Add reviewers if specified
    if (reviewers && reviewers.length > 0) {
      try {
        await octokit.pulls.requestReviewers({
          owner,
          repo,
          pull_number: pr.number,
          reviewers,
        });
      } catch (reviewErr) {
        console.warn('Failed to add reviewers:', reviewErr);
      }
    }

    // Add assignees if specified
    if (assignees && assignees.length > 0) {
      try {
        await octokit.issues.addAssignees({
          owner,
          repo,
          issue_number: pr.number,
          assignees,
        });
      } catch (assignErr) {
        console.warn('Failed to add assignees:', assignErr);
      }
    }

    return res.status(201).json({
      number: pr.number,
      title: pr.title,
      html_url: pr.html_url,
      state: pr.state,
      head: { ref: pr.head.ref },
      base: { ref: pr.base.ref },
      user: { login: pr.user?.login || '' },
      created_at: pr.created_at,
      draft: pr.draft,
    });
  } catch (error: any) {
    console.error('Failed to create pull request:', error);
    const message =
      error.response?.data?.message || error.message || 'Failed to create PR';
    return res.status(error.status || 500).json({ message });
  }
});

// Get branches for repository
router.get('/branches', async (req: Request, res: Response) => {
  try {
    const repository = req.query.repo as string;
    if (!repository) {
      return res.status(400).json({ message: 'repo query parameter required' });
    }

    const octokit = getOctokit();
    const { owner, repo } = parseRepo(repository);

    const { data: branches } = await octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    return res.json(
      branches.map(b => ({
        name: b.name,
        protected: b.protected,
      })),
    );
  } catch (error: any) {
    console.error('Failed to fetch branches:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Failed to fetch branches',
    });
  }
});

export default router;
