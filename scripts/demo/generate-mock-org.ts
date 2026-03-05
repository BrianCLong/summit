import { writeFileSync } from 'fs';
import { join } from 'path';

// Mock Data Types
interface User {
  id: string;
  email: string;
  role: string;
  department: string;
}

interface Repo {
  id: string;
  name: string;
  visibility: 'public' | 'private';
  branchProtection: boolean;
  lastCommit: string;
}

interface NarrativeSignal {
  id: string;
  type: 'pr_comment' | 'commit_message' | 'issue_body';
  content: string;
  riskScore: number;
  repoId: string;
  userId: string;
}

interface MockData {
  users: User[];
  repos: Repo[];
  narrativeSignals: NarrativeSignal[];
}

const generateMockData = (): MockData => {
  const users: User[] = Array.from({ length: 50 }, (_, i) => ({
    id: `u${i}`,
    email: `user${i}@example.com`,
    role: i < 5 ? 'admin' : 'member',
    department: ['engineering', 'sales', 'marketing'][i % 3],
  }));

  const repos: Repo[] = Array.from({ length: 10 }, (_, i) => ({
    id: `r${i}`,
    name: `repo-${i}`,
    visibility: i % 2 === 0 ? 'public' : 'private',
    branchProtection: i % 3 !== 0, // 30% have no branch protection (Drift)
    lastCommit: new Date().toISOString(),
  }));

  const narrativeSignals: NarrativeSignal[] = [
    {
      id: 's1',
      type: 'pr_comment',
      content: 'We should just disable the firewall for now to get this working.',
      riskScore: 0.8,
      repoId: 'r0',
      userId: 'u10',
    },
    {
      id: 's2',
      type: 'issue_body',
      content: 'Can we bypass the compliance check?',
      riskScore: 0.7,
      repoId: 'r2',
      userId: 'u20',
    },
    {
        id: 's3',
        type: 'commit_message',
        content: 'Fixing bug, temporary hack, will fix later',
        riskScore: 0.4,
        repoId: 'r5',
        userId: 'u5',
    }
  ];

  return { users, repos, narrativeSignals };
};

const data = generateMockData();
const outputPath = join(process.cwd(), 'mock-org-data.json');
writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log(`Generated mock data at ${outputPath}`);
console.log(`Users: ${data.users.length}`);
console.log(`Repos: ${data.repos.length}`);
console.log(`Signals: ${data.narrativeSignals.length}`);
