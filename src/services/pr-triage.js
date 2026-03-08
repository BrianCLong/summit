"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapBranchToPr = mapBranchToPr;
exports.getPrForBranch = getPrForBranch;
exports.mapPrToOwner = mapPrToOwner;
exports.getOwnerForPr = getOwnerForPr;
exports.triagePrs = triagePrs;
exports.generateQueueDashboard = generateQueueDashboard;
// Mock data stores
const branchToPrMap = new Map();
const prToOwnerMap = new Map();
/**
 * Maps a branch name to a PR ID
 */
function mapBranchToPr(branchName, prId) {
    branchToPrMap.set(branchName, prId);
}
/**
 * Gets the PR ID for a given branch name
 */
function getPrForBranch(branchName) {
    return branchToPrMap.get(branchName);
}
/**
 * Maps a PR ID to an owner
 */
function mapPrToOwner(prId, owner) {
    prToOwnerMap.set(prId, owner);
}
/**
 * Gets the owner for a given PR ID
 */
function getOwnerForPr(prId) {
    return prToOwnerMap.get(prId);
}
/**
 * Triages a list of PullRequests into specific queues based on their state
 */
function triagePrs(prs) {
    const queues = {
        'merge-ready': [],
        'needs-conflict-resolution': [],
        'needs-owner-review': [],
        'needs-governance-signoff': [],
    };
    for (const pr of prs) {
        // If PR has conflicts, it needs conflict resolution immediately
        if (pr.hasConflicts) {
            queues['needs-conflict-resolution'].push(pr);
            continue;
        }
        // Assign owner if not already assigned, based on mapping
        if (!pr.owner) {
            const mappedOwner = getOwnerForPr(pr.id);
            if (mappedOwner) {
                pr.owner = mappedOwner;
            }
        }
        // Check if the owner has approved the PR
        const ownerReview = pr.owner ? pr.reviews.find(r => r.reviewer === pr.owner) : null;
        const hasOwnerApproval = ownerReview?.state === 'APPROVED';
        // If there is an owner but no approval, it needs owner review
        // (If there is no owner, we might still want someone to review it, but for this exercise we prioritize owner review)
        if (pr.owner && !hasOwnerApproval) {
            queues['needs-owner-review'].push(pr);
            continue;
        }
        // If governance signoff is required but not approved
        if (pr.requiresGovernanceSignoff && !pr.governanceApproved) {
            queues['needs-governance-signoff'].push(pr);
            continue;
        }
        // If it has no conflicts, has owner approval (or doesn't need one because no owner is mapped),
        // and has governance signoff (or doesn't need it), it's merge-ready!
        queues['merge-ready'].push(pr);
    }
    return queues;
}
/**
 * Generates a Markdown formatted queue dashboard
 */
function generateQueueDashboard(queues) {
    let dashboard = '# Pull Request Triage Dashboard\n\n';
    dashboard += '## 🚀 Merge-Ready\n';
    if (queues['merge-ready'].length === 0) {
        dashboard += 'No PRs currently ready to merge.\n';
    }
    else {
        queues['merge-ready'].forEach(pr => {
            dashboard += `- **[${pr.id}]** ${pr.title} (by ${pr.author})\n`;
        });
    }
    dashboard += '\n';
    dashboard += '## ⚠️ Needs Conflict Resolution\n';
    if (queues['needs-conflict-resolution'].length === 0) {
        dashboard += 'No PRs have conflicts.\n';
    }
    else {
        queues['needs-conflict-resolution'].forEach(pr => {
            dashboard += `- **[${pr.id}]** ${pr.title} (by ${pr.author})\n`;
        });
    }
    dashboard += '\n';
    dashboard += '## 👀 Needs Owner Review\n';
    if (queues['needs-owner-review'].length === 0) {
        dashboard += 'No PRs pending owner review.\n';
    }
    else {
        queues['needs-owner-review'].forEach(pr => {
            dashboard += `- **[${pr.id}]** ${pr.title} (by ${pr.author}) - Awaiting review from ${pr.owner}\n`;
        });
    }
    dashboard += '\n';
    dashboard += '## 🏛️ Needs Governance Signoff\n';
    if (queues['needs-governance-signoff'].length === 0) {
        dashboard += 'No PRs pending governance signoff.\n';
    }
    else {
        queues['needs-governance-signoff'].forEach(pr => {
            dashboard += `- **[${pr.id}]** ${pr.title} (by ${pr.author})\n`;
        });
    }
    dashboard += '\n';
    return dashboard;
}
// ----------------------------------------------------------------------------
// CLI Execution Block (Example Usage)
// ----------------------------------------------------------------------------
const url_1 = require("url");
if (process.argv[1] === (0, url_1.fileURLToPath)(import.meta.url)) {
    // Set up some mappings
    mapBranchToPr('feature/auth-login', 'PR-101');
    mapBranchToPr('fix/header-styling', 'PR-102');
    mapBranchToPr('feat/dashboard-api', 'PR-103');
    mapBranchToPr('chore/update-deps', 'PR-104');
    mapPrToOwner('PR-101', '@alice');
    mapPrToOwner('PR-102', '@bob');
    mapPrToOwner('PR-103', '@charlie');
    mapPrToOwner('PR-104', '@devops-team');
    // Create mock PRs
    const mockPrs = [
        {
            id: 'PR-101',
            title: 'Implement OAuth Login',
            branchName: 'feature/auth-login',
            author: '@eve',
            hasConflicts: false,
            requiresGovernanceSignoff: true,
            governanceApproved: false,
            reviews: [{ reviewer: '@alice', state: 'APPROVED' }],
        },
        {
            id: 'PR-102',
            title: 'Fix Header Alignment on Mobile',
            branchName: 'fix/header-styling',
            author: '@eve',
            hasConflicts: true, // Needs conflict resolution
            requiresGovernanceSignoff: false,
            governanceApproved: false,
            reviews: [],
        },
        {
            id: 'PR-103',
            title: 'Create Dashboard API Endpoints',
            branchName: 'feat/dashboard-api',
            author: '@frank',
            hasConflicts: false,
            requiresGovernanceSignoff: false,
            governanceApproved: false,
            reviews: [{ reviewer: '@charlie', state: 'PENDING' }], // Needs owner review
        },
        {
            id: 'PR-104',
            title: 'Bump React Version',
            branchName: 'chore/update-deps',
            author: '@dependabot',
            hasConflicts: false,
            requiresGovernanceSignoff: false,
            governanceApproved: false,
            reviews: [{ reviewer: '@devops-team', state: 'APPROVED' }], // Merge ready!
        },
    ];
    console.log('Triaging PRs...\n');
    const queues = triagePrs(mockPrs);
    console.log('Generating Dashboard...\n');
    const dashboardMarkdown = generateQueueDashboard(queues);
    console.log(dashboardMarkdown);
}
