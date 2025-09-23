const fs = require('node:fs');
const https = require('node:https');
const { URL } = require('node:url');

const {
  GITHUB_TOKEN,
  OWNER,
  REPO,
  WEEKS = '6',
  SPRINT_LENGTH_DAYS = '14'
} = process.env;

if (!GITHUB_TOKEN || !OWNER || !REPO) {
  console.error('GITHUB_TOKEN, OWNER, and REPO are required');
  process.exit(1);
}

const weeks = parseInt(WEEKS, 10);
const sprintLengthDays = parseInt(SPRINT_LENGTH_DAYS, 10);
const sprintLengthMs = sprintLengthDays * 24 * 60 * 60 * 1000;
const now = new Date();
const since = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function githubGraphQL(query, variables) {
  const data = JSON.stringify({ query, variables });
  const options = {
    method: 'POST',
    hostname: 'api.github.com',
    path: '/graphql',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'gh_velocity_script',
      Authorization: `bearer ${GITHUB_TOKEN}`
    }
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let body = '';
      res.on('data', d => (body += d));
      res.on('end', async () => {
        if (parseInt(res.headers['x-ratelimit-remaining'] || '0', 10) < 50) {
          const reset = parseInt(res.headers['x-ratelimit-reset'] || '0', 10) * 1000;
          const wait = reset - Date.now();
          if (wait > 0) {
            console.error(`Rate limit low, waiting ${Math.ceil(wait / 1000)}s`);
            await sleep(wait);
          }
        }
        if (res.statusCode >= 400) {
          return reject(new Error(`GraphQL error ${res.statusCode}: ${body}`));
        }
        const json = JSON.parse(body);
        if (json.errors) return reject(new Error(JSON.stringify(json.errors)));
        resolve(json.data);
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function githubREST(path) {
  const options = {
    method: 'GET',
    hostname: 'api.github.com',
    path,
    headers: {
      'User-Agent': 'gh_velocity_script',
      Authorization: `bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json'
    }
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let body = '';
      res.on('data', d => (body += d));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          return reject(new Error(`REST error ${res.statusCode}: ${body}`));
        }
        resolve(JSON.parse(body));
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  const weight = idx - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function isoWeek(date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function sparkline(values) {
  const blocks = '▁▂▃▄▅▆▇█';
  const max = Math.max(...values, 1);
  return values
    .map(v => blocks[Math.round(((blocks.length - 1) * v) / max)])
    .join('');
}

function extractPoints(pr, issues) {
  for (const l of pr.labels.nodes) {
    const m = /^sp:(\d+)$/i.exec(l.name);
    if (m) return parseInt(m[1], 10);
  }
  const t = /\[sp:(\d+)\]/i.exec(pr.title);
  if (t) return parseInt(t[1], 10);
  let sum = 0;
  for (const issue of issues) {
    for (const l of issue.labels.nodes) {
      const m = /^sp:(\d+)$/i.exec(l.name);
      if (m) {
        sum += parseInt(m[1], 10);
        break;
      }
    }
  }
  return sum || 1;
}

function extractPriority(pr, issues) {
  const map = { p0: 0, critical: 0, p1: 1, high: 1, p2: 2, medium: 2 };
  let best = Infinity;
  function check(labels) {
    for (const l of labels) {
      const k = l.name.toLowerCase();
      if (k in map) best = Math.min(best, map[k]);
    }
  }
  check(pr.labels.nodes);
  for (const issue of issues) check(issue.labels.nodes);
  if (best === Infinity) return null;
  return ['P0', 'P1', 'P2'][best];
}

async function fetchOpenIssues() {
  const issues = [];
  let cursor = null;
  const query = `query($owner:String!,$name:String!,$cursor:String){
    repository(owner:$owner,name:$name){
      issues(first:100,states:OPEN,after:$cursor){
        nodes{number title url labels(first:20){nodes{name}}}
        pageInfo{hasNextPage endCursor}
      }
    }
  }`;
  while (true) {
    const data = await githubGraphQL(query, { owner: OWNER, name: REPO, cursor });
    const conn = data.repository.issues;
    issues.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }
  return issues;
}

async function fetchPRs() {
  const prs = [];
  let cursor = null;
  const query = `query($owner:String!,$name:String!,$cursor:String){
    repository(owner:$owner,name:$name){
      pullRequests(states:MERGED,first:100,after:$cursor,orderBy:{field:UPDATED_AT,direction:DESC}){
        nodes{
          number title body mergedAt createdAt closedAt additions deletions
          labels(first:20){nodes{name}}
          files(first:100){nodes{path}}
          reviews(first:10){nodes{submittedAt}}
          closingIssuesReferences(first:10){nodes{number title url labels(first:20){nodes{name}}}}
        }
        pageInfo{hasNextPage endCursor}
      }
    }
  }`;
  let done = false;
  while (!done) {
    const data = await githubGraphQL(query, { owner: OWNER, name: REPO, cursor });
    const conn = data.repository.pullRequests;
    for (const pr of conn.nodes) {
      if (new Date(pr.mergedAt) < since) {
        done = true;
        break;
      }
      prs.push(pr);
    }
    if (done || !conn.pageInfo.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }
  return prs;
}

async function main() {
  const prs = await fetchPRs();
  const openIssues = await fetchOpenIssues();

  const cycleTimes = [];
  const reviewTimes = [];
  const sizes = [];
  const labelCycles = {};
  const dirSizes = {};
  const throughput = {};

  const sprintCount = Math.ceil((weeks * 7) / sprintLengthDays);
  const sprints = [];
  let end = new Date(now);
  for (let i = 0; i < sprintCount; i++) {
    const start = new Date(end.getTime() - sprintLengthMs);
    sprints.unshift({ start, end, points: 0 });
    end = start;
  }

  const groups = {};

  for (const pr of prs) {
    const issues = pr.closingIssuesReferences.nodes;
    const points = extractPoints(pr, issues);
    const priority = extractPriority(pr, issues);

    const mergedAt = new Date(pr.mergedAt);
    const createdAt = new Date(pr.createdAt);
    const closedAt = new Date(pr.closedAt);
    const cycle = (mergedAt - createdAt) / 3600000;
    cycleTimes.push(cycle);

    const firstReview = pr.reviews.nodes
      .map(r => new Date(r.submittedAt))
      .sort((a, b) => a - b)[0];
    const review = firstReview
      ? (mergedAt - firstReview) / 3600000
      : (closedAt - createdAt) / 3600000;
    reviewTimes.push(review);

    const size = pr.additions + pr.deletions;
    sizes.push(size);

    const week = isoWeek(mergedAt);
    throughput[week] = (throughput[week] || 0) + 1;

    for (const l of pr.labels.nodes) {
      labelCycles[l.name] = labelCycles[l.name] || [];
      labelCycles[l.name].push(cycle);
    }

    for (const f of pr.files.nodes) {
      const dir = f.path.split('/')[0];
      dirSizes[dir] = dirSizes[dir] || [];
      dirSizes[dir].push(size);
    }

    for (const s of sprints) {
      if (mergedAt > s.start && mergedAt <= s.end) {
        s.points += points;
        break;
      }
    }

    if (priority === 'P0' || priority === 'P1') {
      const key = issues.length ? `issue-${issues[0].number}` : `pr-${pr.number}`;
      if (!groups[key]) {
        const title = issues.length ? issues[0].title : pr.title;
        groups[key] = {
          key: `${priority}: ${title}`,
          priority,
          completedPoints: 0,
          remainingPoints: 0,
          velocityPointsPerSprint: 0,
          distanceSprints: 0,
          eta: '',
          openItems: [],
          recentMerged: []
        };
      }
      const g = groups[key];
      g.completedPoints += points;
      g.recentMerged.push({
        pr: pr.number,
        title: pr.title,
        points,
        mergedAt: pr.mergedAt
      });
    }
  }

  for (const issue of openIssues) {
    const prio = extractPriority({ labels: { nodes: issue.labels.nodes } }, []);
    if (prio === 'P0' || prio === 'P1') {
      const pts = extractPoints({ labels: { nodes: issue.labels.nodes }, title: issue.title }, []);
      const key = `issue-${issue.number}`;
      if (!groups[key]) {
        groups[key] = {
          key: `${prio}: ${issue.title}`,
          priority: prio,
          completedPoints: 0,
          remainingPoints: 0,
          velocityPointsPerSprint: 0,
          distanceSprints: 0,
          eta: '',
          openItems: [],
          recentMerged: []
        };
      }
      const g = groups[key];
      g.remainingPoints += pts;
      g.openItems.push({
        type: 'issue',
        number: issue.number,
        title: issue.title,
        points: pts,
        url: issue.url
      });
    }
  }

  for (const g of Object.values(groups)) {
    const hist = [];
    for (const pr of g.recentMerged) {
      const mergedAt = new Date(pr.mergedAt);
      for (let i = 0; i < sprints.length; i++) {
        const s = sprints[i];
        if (mergedAt > s.start && mergedAt <= s.end) {
          hist[i] = (hist[i] || 0) + pr.points;
          break;
        }
      }
    }
    const recent = hist.slice(-3);
    g.velocityPointsPerSprint =
      recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
    g.distanceSprints = Math.ceil(
      g.remainingPoints / Math.max(g.velocityPointsPerSprint, 0.1)
    );
    g.eta = new Date(now.getTime() + g.distanceSprints * sprintLengthMs)
      .toISOString()
      .split('T')[0];
  }

  let bottleneckLabel = null;
  let maxCycle = 0;
  for (const [label, times] of Object.entries(labelCycles)) {
    const med = percentile(times, 50);
    if (med > maxCycle) {
      maxCycle = med;
      bottleneckLabel = label;
    }
  }

  let bottleneckDir = null;
  let maxDir = 0;
  for (const [dir, arr] of Object.entries(dirSizes)) {
    const med = percentile(arr, 50);
    if (med > maxDir) {
      maxDir = med;
      bottleneckDir = dir;
    }
  }

  const metrics = {
    generatedAt: now.toISOString(),
    sprintLengthDays,
    velocity: {
      perSprint: sprints.map(s => ({
        sprintStart: s.start.toISOString(),
        sprintEnd: s.end.toISOString(),
        points: s.points
      }))
    },
    throughput: {
      perWeek: Object.entries(throughput)
        .sort((a, b) => (a[0] > b[0] ? 1 : -1))
        .map(([week, prs]) => ({ week, prs }))
    },
    cycleTimeHours: {
      p50: percentile(cycleTimes, 50),
      p75: percentile(cycleTimes, 75),
      p90: percentile(cycleTimes, 90)
    },
    reviewTimeHours: {
      p50: percentile(reviewTimes, 50),
      p75: percentile(reviewTimes, 75),
      p90: percentile(reviewTimes, 90)
    },
    size: {
      medianChanges: percentile(sizes, 50)
    },
    priorityGroups: Object.values(groups)
  };

  fs.writeFileSync('metrics.json', JSON.stringify(metrics, null, 2));

  console.log(`# Velocity Summary\n`);
  const spark = sparkline(sprints.map(s => s.points));
  console.log(`Sprints: ${spark}`);
  console.log('');
  console.log(
    '| Group | Priority | Completed pts | Remaining pts | V (pts/sprint) | Distance (sprints) | ETA |'
  );
  console.log(
    '|---|---|---|---|---|---|---|'
  );
  for (const g of Object.values(groups)) {
    console.log(
      `| ${g.key} | ${g.priority} | ${g.completedPoints} | ${g.remainingPoints} | ${g.velocityPointsPerSprint.toFixed(
        1
      )} | ${g.distanceSprints} | ${g.eta} |`
    );
  }
  console.log('');
  console.log('**Top Bottlenecks**');
  console.log('');
  console.log(
    `- Cycle Time by label: ${bottleneckLabel || 'n/a'} (${maxCycle.toFixed(1)}h median)`
  );
  console.log(
    `- PR size by directory: ${bottleneckDir || 'n/a'} (${maxDir.toFixed(1)} changes median)`
  );
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});

