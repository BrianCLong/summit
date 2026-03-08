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
const rest_1 = require("@octokit/rest");
const fs = __importStar(require("fs"));
const gh = new rest_1.Octokit({ auth: process.env.GITHUB_TOKEN });
const [o, r] = process.env.GITHUB_REPOSITORY.split("/");
(async () => {
    const num = Number(process.env.EPIC_NUMBER);
    const { data: epic } = await gh.issues.get({ owner: o, repo: r, issue_number: num });
    const changedAreas = (epic.body || "").match(/Areas:(.*)$
        / im)?.[1]?.split(",").map(s => s.trim()) || ["server", "client"];
    const owners = JSON.parse(fs.readFileSync(".github/CODEOWNERS_MAP.json", "utf8")); // prebuilt map
    for (const area of changedAreas) {
        const assignee = owners[area]?.[0];
        await gh.issues.create({ owner: o, repo: r, title: `[Slice] ${epic.title} — ${area}`, body: `From #${num}\n\n- [ ] Design\n- [ ] Code\n- [ ] Tests\n- [ ] Docs`, assignees: assignee ? [assignee] : undefined, labels: ["slice"] });
    }
})();
