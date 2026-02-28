const https = require('https');
const fs = require('fs');
const path = require('path');

const EXPECTED_CONFIG_PATH = path.join(__dirname, '../../governance/branch-protection.json');

function request(url, options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
            resolve({ error: true, status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;

  if (!token || !repo) {
    console.error("Missing GITHUB_TOKEN or GITHUB_REPOSITORY");
    process.exit(1);
  }

  let expectedConfig;
  try {
      expectedConfig = JSON.parse(fs.readFileSync(EXPECTED_CONFIG_PATH, 'utf8'));
  } catch (e) {
      console.error("Failed to read expected config:", e.message);
      process.exit(1);
  }

  const branch = expectedConfig.branch || 'main';
  const url = `https://api.github.com/repos/${repo}/branches/${branch}/protection`;

  console.log(`Checking branch protection for ${repo}/${branch}...`);

  const actualConfig = await request(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'governance-check'
    }
  });

  if (actualConfig.error) {
    if (actualConfig.status === 404) {
      console.log("::warning::Branch protection not found or not enabled.");
      await reportDrift(repo, token, ["Branch protection not enabled on " + branch]);
      process.exit(0); // Exit 0 to not fail the job, just warn
    }
    console.error(`Failed to fetch branch protection: ${actualConfig.status}`);
    process.exit(1);
  }

  const drift = compareConfigs(expectedConfig, actualConfig);

  if (drift.length > 0) {
    console.log("::warning::Governance drift detected:");
    drift.forEach(d => console.log(`- ${d}`));
    if (process.env.CI) {
      await reportDrift(repo, token, drift);
    }
    process.exit(1);
  } else {
    console.log("Branch protection matches governance expectations.");
  }
}

function compareConfigs(expected, actual) {
  const drift = [];

  // Enforce Admins
  if (expected.enforce_admins !== undefined) {
      const actualEnabled = actual.enforce_admins?.enabled;
      if (expected.enforce_admins !== actualEnabled) {
          drift.push(`enforce_admins: expected ${expected.enforce_admins}, got ${actualEnabled}`);
      }
  }

  // Required Status Checks
  if (expected.required_status_checks) {
      if (!actual.required_status_checks) {
          drift.push("required_status_checks: expected configuration, but none found");
      } else {
          if (expected.required_status_checks.strict !== undefined &&
              expected.required_status_checks.strict !== actual.required_status_checks.strict) {
              drift.push(`required_status_checks.strict: expected ${expected.required_status_checks.strict}, got ${actual.required_status_checks.strict}`);
          }

          if (expected.required_status_checks.contexts) {
              const expectedContexts = expected.required_status_checks.contexts;
              const actualContexts = actual.required_status_checks.contexts || [];
              const missing = expectedContexts.filter(c => !actualContexts.includes(c));
              if (missing.length > 0) {
                  drift.push(`required_status_checks.contexts: missing ${missing.join(', ')}`);
              }
          }
      }
  }

  // Required Pull Request Reviews
  if (expected.required_pull_request_reviews) {
      if (!actual.required_pull_request_reviews) {
          drift.push("required_pull_request_reviews: expected configuration, but none found");
      } else {
          const exp = expected.required_pull_request_reviews;
          const act = actual.required_pull_request_reviews;

          if (exp.dismiss_stale_reviews !== undefined && exp.dismiss_stale_reviews !== act.dismiss_stale_reviews) {
              drift.push(`dismiss_stale_reviews: expected ${exp.dismiss_stale_reviews}, got ${act.dismiss_stale_reviews}`);
          }
          if (exp.require_code_owner_reviews !== undefined && exp.require_code_owner_reviews !== act.require_code_owner_reviews) {
              drift.push(`require_code_owner_reviews: expected ${exp.require_code_owner_reviews}, got ${act.require_code_owner_reviews}`);
          }
          if (exp.required_approving_review_count !== undefined && exp.required_approving_review_count !== act.required_approving_review_count) {
              drift.push(`required_approving_review_count: expected ${exp.required_approving_review_count}, got ${act.required_approving_review_count}`);
          }
      }
  }

  return drift;
}

async function reportDrift(repo, token, drift) {
    const title = "Golden Path: Governance Drift detected";
    const body = `Governance drift detected on branch protection settings for this repository:\n\n${drift.map(d => `- ${d}`).join('\n')}\n\nPlease review the governance/branch-protection.json file and reconcile.`;

    const searchUrl = `https://api.github.com/search/issues?q=repo:${repo}+is:issue+is:open+"${encodeURIComponent(title)}"`;

    try {
        const searchRes = await request(searchUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'governance-check'
            }
        });

        if (searchRes.items && searchRes.items.length > 0) {
            console.log("Existing drift issue found. Skipping creation.");
            return;
        }

        const issueUrl = `https://api.github.com/repos/${repo}/issues`;
        const issueData = JSON.stringify({
            title,
            body,
            labels: ['triage:needed', 'governance']
        });

        await request(issueUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'governance-check'
            }
        }, issueData);
        console.log("Created governance drift issue.");
    } catch (e) {
        console.error("Failed to report drift:", e.message);
    }
}

main();
