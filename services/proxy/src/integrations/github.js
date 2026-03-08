"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileIncident = fileIncident;
exports.upsertRunReport = upsertRunReport;
exports.createPullRequest = createPullRequest;
exports.listBranches = listBranches;
const rest_1 = require("@octokit/rest");
const owner = process.env.GH_OWNER;
const repo = process.env.GH_REPO;
const token = process.env.GH_TOKEN;
const octo = new rest_1.Octokit({ auth: token });
async function fileIncident(title, body, labels = ['incident']) {
    const r = await octo.issues.create({ owner, repo, title, body, labels });
    return r.data.number;
}
async function upsertRunReport(auditId, jsonl) {
    const path = `runs/${auditId}.jsonl`;
    await octo.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message: `chore(run-report): ${auditId}`,
        content: Buffer.from(jsonl).toString('base64'),
        committer: { name: 'sym‑bot', email: 'bot@symphony.local' },
        author: { name: 'sym‑bot', email: 'bot@symphony.local' },
    });
}
async function createPullRequest(params) {
    const { title, body, head, base = 'main', draft = false, labels = [], assignees = [], targetRepo, } = params;
    const [targetOwner, targetRepoName] = targetRepo
        ? targetRepo.split('/')
        : [owner, repo];
    const pr = await octo.pulls.create({
        owner: targetOwner,
        repo: targetRepoName,
        title,
        body,
        head,
        base,
        draft,
    });
    // Add labels if provided
    if (labels.length > 0) {
        await octo.issues.addLabels({
            owner: targetOwner,
            repo: targetRepoName,
            issue_number: pr.data.number,
            labels,
        });
    }
    // Add assignees if provided
    if (assignees.length > 0) {
        await octo.issues.addAssignees({
            owner: targetOwner,
            repo: targetRepoName,
            issue_number: pr.data.number,
            assignees,
        });
    }
    return {
        number: pr.data.number,
        url: pr.data.url,
        htmlUrl: pr.data.html_url,
        state: pr.data.state,
        title: pr.data.title,
        draft: pr.data.draft ?? false,
        mergeable: pr.data.mergeable,
        createdAt: pr.data.created_at,
    };
}
async function listBranches(targetRepo) {
    const [targetOwner, targetRepoName] = targetRepo
        ? targetRepo.split('/')
        : [owner, repo];
    const branches = await octo.repos.listBranches({
        owner: targetOwner,
        repo: targetRepoName,
        per_page: 100,
    });
    return branches.data.map(b => ({
        name: b.name,
        protected: b.protected,
    }));
}
