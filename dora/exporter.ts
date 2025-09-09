import { Octokit } from 'octokit';
import http from 'http';
const client = new Octokit({ auth: process.env.GH_TOKEN });
let metrics = { deploys: 0, lead_time_s: 0, mttr_s: 0, cfr: 0 };

async function updateMetrics() {
  try {
    // Fetch deployments from GitHub API
    const releases = await client.rest.repos.listReleases({
      owner: process.env.GITHUB_REPOSITORY?.split('/')[0] || 'BrianCLong',
      repo: process.env.GITHUB_REPOSITORY?.split('/')[1] || 'intelgraph',
      per_page: 30
    });
    
    metrics.deploys = releases.data.length;
    
    // Calculate lead time (time from first commit to release)
    if (releases.data.length > 0) {
      const latest = releases.data[0];
      const publishedAt = new Date(latest.published_at!).getTime();
      const createdAt = new Date(latest.created_at!).getTime();
      metrics.lead_time_s = (publishedAt - createdAt) / 1000;
    }
    
    // TODO: compute MTTR and CFR from incident/issue data
    console.log('Updated DORA metrics:', metrics);
  } catch (error) {
    console.error('Failed to update DORA metrics:', error);
  }
}

// Update metrics every 5 minutes
setInterval(updateMetrics, 5 * 60 * 1000);
updateMetrics(); // Initial update

// Expose metrics via HTTP endpoint
http.createServer((req, res) => {
  if (req.url === '/metrics') {
    const output = `
# HELP dora_deploys Total deployments
# TYPE dora_deploys gauge
dora_deploys ${metrics.deploys}

# HELP dora_lead_time_seconds Lead time for changes in seconds
# TYPE dora_lead_time_seconds gauge
dora_lead_time_seconds ${metrics.lead_time_s}

# HELP dora_mttr_seconds Mean time to recovery in seconds
# TYPE dora_mttr_seconds gauge
dora_mttr_seconds ${metrics.mttr_s}

# HELP dora_change_failure_rate Change failure rate
# TYPE dora_change_failure_rate gauge
dora_change_failure_rate ${metrics.cfr}
`;
    res.setHeader('Content-Type', 'text/plain');
    res.end(output);
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
}).listen(9102, () => {
  console.log('DORA exporter listening on port 9102');
});