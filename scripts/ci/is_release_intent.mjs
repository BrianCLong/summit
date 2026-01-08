import { env, stdout } from 'process';
import { readFileSync } from 'fs';

const GITHUB_TOKEN = env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = env.GITHUB_REPOSITORY;
const GITHUB_EVENT_NAME = env.GITHUB_EVENT_NAME;
const GITHUB_REF = env.GITHUB_REF;
const GITHUB_EVENT_PATH = env.GITHUB_EVENT_PATH;
const TARGET_LABEL = 'release-intent';

async function checkIntent() {
  // 1. Check for manual strict mode (workflow_dispatch inputs)
  if (GITHUB_EVENT_NAME === 'workflow_dispatch') {
      try {
          if (GITHUB_EVENT_PATH) {
              const eventData = JSON.parse(readFileSync(GITHUB_EVENT_PATH, 'utf8'));
              if (eventData.inputs && eventData.inputs.strict_mode === 'true') {
                   return { result: true, reason: "Manual strict_mode enabled" };
              }
          }
      } catch (e) {
          // ignore
      }
  }

  // 2. Check PR Label
  if (GITHUB_EVENT_NAME === 'pull_request' || GITHUB_EVENT_NAME === 'pull_request_target') {
    let prNumber;
    let eventData;

    try {
        if (GITHUB_EVENT_PATH) {
             eventData = JSON.parse(readFileSync(GITHUB_EVENT_PATH, 'utf8'));
             prNumber = eventData.pull_request?.number;
        }
    } catch (e) {
        // ignore
    }

    if (!prNumber && GITHUB_REF) {
        // Attempt to parse refs/pull/123/merge
        const match = GITHUB_REF.match(/refs\/pull\/(\d+)\//);
        if (match) {
            prNumber = match[1];
        }
    }

    if (!prNumber) {
        return { result: false, reason: "Could not determine PR number" };
    }

    // Strategy A: Check event payload first (avoids API call if possible)
    if (eventData && eventData.pull_request && eventData.pull_request.labels) {
        const hasLabel = eventData.pull_request.labels.some(l => l.name === TARGET_LABEL);
        // If label is in payload, we are good.
        if (hasLabel) {
             return { result: true, reason: `Label '${TARGET_LABEL}' present in event payload` };
        }
    }

    // Strategy B: Fetch from API (in case label was added after event or payload is stale/missing)
    if (GITHUB_TOKEN && GITHUB_REPOSITORY) {
        try {
            const url = `https://api.github.com/repos/${GITHUB_REPOSITORY}/pulls/${prNumber}`;
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'scripts/ci/is_release_intent.mjs'
                }
            });

            if (res.ok) {
                const data = await res.json();
                const hasLabel = data.labels && data.labels.some(l => l.name === TARGET_LABEL);
                if (hasLabel) {
                    return { result: true, reason: `Label '${TARGET_LABEL}' fetched from API` };
                }
                return { result: false, reason: `Label '${TARGET_LABEL}' not found on PR` };
            }
        } catch (e) {
             console.error(`Error fetching PR labels: ${e.message}`);
        }
    }

    return { result: false, reason: "PR does not have release intent" };
  }

  // 3. Check Branch (non-PR)
  if (GITHUB_REF) {
      if (GITHUB_REF.startsWith('refs/heads/release/') || GITHUB_REF.startsWith('refs/tags/v')) {
          return { result: true, reason: `Protected release ref detected: ${GITHUB_REF}` };
      }
      if (GITHUB_REF === 'refs/heads/main') {
           return { result: true, reason: "Main branch implies release intent" };
      }
  }

  return { result: false, reason: "No release intent signal detected" };
}

checkIntent().then(res => {
    stdout.write(JSON.stringify(res));
});
