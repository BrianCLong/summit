"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const octokit_1 = require("octokit");
const http_1 = __importDefault(require("http"));
const _client = new octokit_1.Octokit({ auth: process.env.GH_TOKEN });
const metrics = { deploys: 0, lead_time_s: 0, mttr_s: 0, cfr: 0 };
// TODO: compute from releases, deployments, incidents issues
http_1.default
    .createServer((_req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.end(`# HELP dora_deploys deployments\n# TYPE dora_deploys gauge\ndora_deploys ${metrics.deploys}\n`);
})
    .listen(9102);
