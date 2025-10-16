import { Octokit } from 'octokit';
import http from 'http';
const client = new Octokit({ auth: process.env.GH_TOKEN });
const metrics = { deploys: 0, lead_time_s: 0, mttr_s: 0, cfr: 0 };
// TODO: compute from releases, deployments, incidents issues
http
  .createServer((_req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.end(
      `# HELP dora_deploys deployments\n# TYPE dora_deploys gauge\ndora_deploys ${metrics.deploys}\n`,
    );
  })
  .listen(9102);
