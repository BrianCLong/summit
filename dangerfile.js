"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const danger_1 = require("danger");
if (!danger.github.pr.body || danger.github.pr.body.length < 20)
    (0, danger_1.fail)('PR description too short');
if (!/#[0-9]+/.test(danger.github.pr.body))
    (0, danger_1.warn)('Link an issue (e.g., #123)');
if (danger.github.pr.additions + danger.github.pr.deletions > 1500)
    (0, danger_1.warn)('Consider splitting: PR is large');
// Require tests/docs for src changes
