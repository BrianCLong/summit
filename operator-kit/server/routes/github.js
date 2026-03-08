"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ghRouter = void 0;
const express_1 = __importDefault(require("express"));
exports.ghRouter = express_1.default.Router();
const GH_TOKEN = process.env.GITHUB_TOKEN || '';
const GH_REPO = process.env.GITHUB_REPO || 'owner/repo'; // e.g. acme/symphony
async function gh(path, method, body) {
    const url = `https://api.github.com/repos/${GH_REPO}${path}`;
    const res = await fetch(url, {
        method,
        headers: {
            Authorization: `Bearer ${GH_TOKEN}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'symphony-operator-kit',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok)
        throw new Error(`${res.status} ${await res.text()}`);
    return res.json();
}
exports.ghRouter.post('/issues', async (req, res) => {
    try {
        const { kind = 'decision', title, body, labels = [], attachments = [], } = req.body || {};
        const issue = await gh('/issues', 'POST', {
            title: `[${kind.toUpperCase()}] ${title}`,
            body,
            labels,
        });
        // naive attachment as comment
        for (const a of attachments) {
            await gh(`/issues/${issue.number}/comments`, 'POST', {
                body: `Attachment **${a.name}**\n\n\`${a.contentBase64?.slice(0, 120)}\``,
            });
        }
        res.json({ ok: true, issue });
    }
    catch (e) {
        res.status(500).json({ error: e?.message || 'github_error' });
    }
});
