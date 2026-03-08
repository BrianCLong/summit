"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthIntegrationsRouter = healthIntegrationsRouter;
const express_1 = require("express");
function healthIntegrationsRouter() {
    const r = (0, express_1.Router)();
    r.get('/health/integrations', async (_req, res) => {
        const out = {
            github: { ok: false },
            jira: { ok: false },
            maestro: { ok: false },
        };
        // GitHub App check (optional)
        try {
            const appId = process.env.GITHUB_APP_ID;
            const installationId = Number(process.env.GITHUB_INSTALLATION_ID);
            const privateKey = process.env.GITHUB_PRIVATE_KEY;
            if (appId && installationId && privateKey) {
                const { Octokit } = await Promise.resolve().then(() => __importStar(require('octokit')));
                const { createAppAuth } = await Promise.resolve().then(() => __importStar(require('@octokit/auth-app')));
                const gh = new Octokit({
                    authStrategy: createAppAuth,
                    auth: { appId: Number(appId), installationId, privateKey },
                });
                await gh.request('GET /installation/repositories');
                out.github.ok = true;
            }
            else {
                out.github.note = 'missing env';
            }
        }
        catch (e) {
            out.github.note = e?.status ? `HTTP ${e.status}` : 'auth failed';
        }
        // Jira check (optional)
        try {
            const base = process.env.JIRA_BASE_URL;
            const email = process.env.JIRA_EMAIL;
            const token = process.env.JIRA_API_TOKEN;
            if (base && email && token) {
                const auth = Buffer.from(`${email}:${token}`).toString('base64');
                const r = await fetch(`${base}/rest/api/3/myself`, {
                    headers: { Authorization: `Basic ${auth}` },
                });
                out.jira.ok = r.ok;
                if (!r.ok)
                    out.jira.note = `HTTP ${r.status}`;
            }
            else {
                out.jira.note = 'missing env';
            }
        }
        catch {
            out.jira.note = 'auth failed';
        }
        // Maestro GraphQL check
        try {
            const base = process.env.MAESTRO_BASE_URL || 'https://maestro.dev.topicality.co';
            const path = process.env.MAESTRO_GRAPHQL_PATH || '/api/graphql';
            const q = `query { __typename }`;
            const rsp = await fetch(`${base}${path}`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ query: q }),
            });
            out.maestro.ok = rsp.ok;
            if (!rsp.ok)
                out.maestro.note = `HTTP ${rsp.status}`;
        }
        catch {
            out.maestro.note = 'unreachable';
        }
        const greens = Object.values(out).filter((v) => v.ok).length;
        const code = greens === 3 ? 200 : greens > 0 ? 207 : 503;
        res.status(code).json(out);
    });
    return r;
}
