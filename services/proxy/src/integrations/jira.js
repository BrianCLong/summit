"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJiraIssue = createJiraIssue;
const node_fetch_1 = __importDefault(require("node-fetch"));
async function createJiraIssue({ baseUrl, email, apiToken, projectKey, summary, description, }) {
    const url = `${baseUrl}/rest/api/3/issue`;
    const res = await (0, node_fetch_1.default)(url, {
        method: 'POST',
        headers: {
            Authorization: 'Basic ' + Buffer.from(`${email}:${apiToken}`).toString('base64'),
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            fields: {
                project: { key: projectKey },
                summary,
                description,
                issuetype: { name: 'Task' },
            },
        }),
    });
    if (!res.ok)
        throw new Error(`Jira create failed: ${res.status} ${await res.text()}`);
    return res.json();
}
