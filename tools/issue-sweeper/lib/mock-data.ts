/**
 * Mock data for testing the issue sweeper without GitHub API access
 */

import { GitHubIssue } from './types.js';

export const mockIssues: GitHubIssue[] = [
  {
    number: 1,
    title: 'Fix TypeScript compilation error in auth module',
    body: 'The auth module fails to compile with error: `Property does not exist on type`. File: `server/auth/index.ts`',
    state: 'open',
    labels: [{ name: 'bug' }],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    html_url: 'https://github.com/BrianCLong/summit/issues/1',
    user: { login: 'testuser' },
  },
  {
    number: 2,
    title: 'Add dark mode support',
    body: 'Would be great to have dark mode for the UI',
    state: 'open',
    labels: [{ name: 'enhancement' }, { name: 'feature' }],
    created_at: '2024-01-16T10:00:00Z',
    updated_at: '2024-01-16T10:00:00Z',
    html_url: 'https://github.com/BrianCLong/summit/issues/2',
    user: { login: 'testuser' },
  },
  {
    number: 3,
    title: 'Update documentation for GraphQL API',
    body: 'The GraphQL API documentation is outdated and missing several endpoints',
    state: 'open',
    labels: [{ name: 'documentation' }],
    created_at: '2024-01-17T10:00:00Z',
    updated_at: '2024-01-17T10:00:00Z',
    html_url: 'https://github.com/BrianCLong/summit/issues/3',
    user: { login: 'testuser' },
  },
  {
    number: 4,
    title: 'Security vulnerability in dependency',
    body: 'CVE-2024-XXXXX affects version 1.2.3 of package xyz',
    state: 'open',
    labels: [{ name: 'security' }],
    created_at: '2024-01-18T10:00:00Z',
    updated_at: '2024-01-18T10:00:00Z',
    html_url: 'https://github.com/BrianCLong/summit/issues/4',
    user: { login: 'testuser' },
  },
  {
    number: 5,
    title: 'How do I configure authentication?',
    body: 'I am trying to set up authentication but the docs are unclear',
    state: 'open',
    labels: [{ name: 'question' }],
    created_at: '2024-01-19T10:00:00Z',
    updated_at: '2024-01-19T10:00:00Z',
    html_url: 'https://github.com/BrianCLong/summit/issues/5',
    user: { login: 'testuser' },
  },
];
