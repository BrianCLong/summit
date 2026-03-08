"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const rest_1 = require("@octokit/rest");
const fs_1 = __importDefault(require("fs"));
const gh = new rest_1.Octokit({ auth: process.env.GITHUB_TOKEN });
const [o, r] = process.env.GITHUB_REPOSITORY.split('/');
(async () => {
    const issues = (await gh.issues.listForRepo({
        owner: o,
        repo: r,
        state: 'open',
        per_page: 200,
    })).data.filter((i) => !i.pull_request);
    // Parse “Depends: #123,#456” hints
    const deps = issues.map((i) => ({
        num: i.number,
        deps: (i.body || '').match(/#\d+/g)?.map((s) => Number(s.slice(1))) || [],
    }));
    fs_1.default.writeFileSync('deps.json', JSON.stringify(deps, null, 2));
})();
