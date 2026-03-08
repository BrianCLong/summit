"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const generateMockData = () => {
    const users = Array.from({ length: 50 }, (_, i) => ({
        id: `u${i}`,
        email: `user${i}@example.com`,
        role: i < 5 ? 'admin' : 'member',
        department: ['engineering', 'sales', 'marketing'][i % 3],
    }));
    const repos = Array.from({ length: 10 }, (_, i) => ({
        id: `r${i}`,
        name: `repo-${i}`,
        visibility: i % 2 === 0 ? 'public' : 'private',
        branchProtection: i % 3 !== 0, // 30% have no branch protection (Drift)
        lastCommit: new Date().toISOString(),
    }));
    const narrativeSignals = [
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
const outputPath = (0, path_1.join)(process.cwd(), 'mock-org-data.json');
(0, fs_1.writeFileSync)(outputPath, JSON.stringify(data, null, 2));
console.log(`Generated mock data at ${outputPath}`);
console.log(`Users: ${data.users.length}`);
console.log(`Repos: ${data.repos.length}`);
console.log(`Signals: ${data.narrativeSignals.length}`);
