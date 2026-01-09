import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const ROADMAP_PATH = path.join(ROOT, 'configs/agent-roadmap/ROADMAP.yaml');
const POLICY_PATH = path.join(ROOT, 'policies/agent-roadmap.yml');

const toArray = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const parseArgs = (argv) => {
  const args = {};
  argv.forEach((arg) => {
    if (arg === '--explain') {
      args.explain = true;
      return;
    }
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (key && value !== undefined) {
        args[key] = value;
      }
    }
  });
  return args;
};

const readYamlFile = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  return yaml.load(raw);
};

const policy = fs.existsSync(POLICY_PATH)
  ? readYamlFile(POLICY_PATH)
  : { agent_roadmap: {} };
const defaults = policy.agent_roadmap ?? {};

const args = parseArgs(process.argv.slice(2));
const agent = args.agent ?? defaults.default_agent ?? 'any';
const focus = args.focus ?? defaults.default_focus ?? 'any';
const includeStatus = toArray(
  args['include-status'] ?? defaults.include_status ?? ['planned'],
);
const explain = args.explain ?? false;
const maxRecommendations = Number(
  defaults.max_recommendations ?? 3,
);

const roadmap = readYamlFile(ROADMAP_PATH);
const sprints = roadmap.sprints ?? [];
const sprintIndex = new Map(sprints.map((sprint) => [sprint.id, sprint]));

const matchesAgent = (sprint) => {
  if (agent === 'any') {
    return true;
  }
  return sprint.owner_agent === agent || sprint.owner_agent === 'mixed';
};

const matchesFocus = (sprint) => {
  if (focus === 'any') {
    return true;
  }
  return sprint.category === focus;
};

const matchesStatus = (sprint) => includeStatus.includes(sprint.status);

const evaluatePrereqs = (sprint) => {
  const prerequisites = sprint.prerequisites ?? [];
  if (prerequisites.length === 0) {
    return { ready: true, matched: [], unmet: [] };
  }
  const matched = [];
  const unmet = [];
  prerequisites.forEach((prereqId) => {
    const prereq = sprintIndex.get(prereqId);
    if (!prereq) {
      unmet.push(`${prereqId} (missing)`);
      return;
    }
    if (['in_progress', 'done'].includes(prereq.status)) {
      matched.push(`${prereqId} (${prereq.status})`);
      return;
    }
    unmet.push(`${prereqId} (${prereq.status})`);
  });
  if (matched.length === 0) {
    return { ready: false, matched, unmet };
  }
  return { ready: unmet.length === 0, matched, unmet };
};

const candidates = sprints
  .filter(matchesAgent)
  .filter(matchesFocus)
  .filter(matchesStatus)
  .map((sprint) => {
    const prereqStatus = evaluatePrereqs(sprint);
    return {
      sprint,
      prereqStatus,
    };
  })
  .filter(({ prereqStatus }) => prereqStatus.ready)
  .sort((a, b) => {
    if (a.sprint.priority !== b.sprint.priority) {
      return a.sprint.priority - b.sprint.priority;
    }
    return a.sprint.id.localeCompare(b.sprint.id);
  });

const recommendations = candidates.slice(0, maxRecommendations);
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactDir = path.join(ROOT, 'artifacts/agent-roadmap');
fs.mkdirSync(artifactDir, { recursive: true });

const rankedList = candidates.map(({ sprint, prereqStatus }, index) => {
  const reasons = [
    `priority=${sprint.priority}`,
    `status=${sprint.status}`,
    `category=${sprint.category}`,
  ];
  if (agent !== 'any') {
    reasons.push(`agent=${agent}`);
  }
  if (focus !== 'any') {
    reasons.push(`focus=${focus}`);
  }
  if (prereqStatus.matched.length > 0) {
    reasons.push(`prerequisites matched: ${prereqStatus.matched.join(', ')}`);
  }
  if (prereqStatus.unmet.length > 0) {
    reasons.push(`prerequisites unmet: ${prereqStatus.unmet.join(', ')}`);
  }
  return {
    rank: index + 1,
    id: sprint.id,
    title: sprint.title,
    owner_agent: sprint.owner_agent,
    category: sprint.category,
    priority: sprint.priority,
    status: sprint.status,
    prompt_path: sprint.prompt_path,
    prerequisites: sprint.prerequisites ?? [],
    reasons,
    recommended: index < recommendations.length,
  };
});

const artifact = {
  generated_at: new Date().toISOString(),
  filters: {
    agent,
    focus,
    include_status: includeStatus,
  },
  max_recommendations: maxRecommendations,
  candidates: rankedList,
};

const artifactPath = path.join(
  artifactDir,
  `PLAN_${timestamp}.json`,
);
fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));

if (recommendations.length === 0) {
  console.log('No eligible sprints found. Deferred pending prerequisite progress.');
  console.log(`Artifact: ${path.relative(ROOT, artifactPath)}`);
  process.exit(0);
}

if (explain) {
  const focusLabel = focus === 'any' ? 'any focus' : focus;
  const agentLabel = agent === 'any' ? 'any agent' : agent;
  console.log(
    `# Next Sprint Recommendations\n\nBecause you want ${focusLabel} and ${agentLabel}, the next best sprint options are:`,
  );
  recommendations.forEach(({ sprint, prereqStatus }, index) => {
    const prereqSummary = (sprint.prerequisites ?? [])
      .map((prereqId) => {
        const prereq = sprintIndex.get(prereqId);
        if (!prereq) {
          return `${prereqId} (missing)`;
        }
        return `${prereqId} (${prereq.status})`;
      })
      .join(', ');
    const prereqLine = prereqSummary
      ? `Dependencies: ${prereqSummary}`
      : 'Dependencies: None';
    const matchedLine =
      prereqStatus.matched.length > 0
        ? `Matched: ${prereqStatus.matched.join(', ')}`
        : 'Matched: None';
    console.log(
      `\n${index + 1}. **${sprint.title}** (${sprint.id})\n   - Priority: ${sprint.priority}\n   - Category: ${sprint.category}\n   - Prompt: ${sprint.prompt_path}\n   - ${prereqLine}\n   - ${matchedLine}`,
    );
  });
  console.log(`\nArtifact: ${path.relative(ROOT, artifactPath)}`);
  process.exit(0);
}

console.log('Recommended sprints:');
recommendations.forEach(({ sprint }, index) => {
  console.log(
    `${index + 1}) ${sprint.title} (${sprint.id}) [priority ${sprint.priority}] -> ${sprint.prompt_path}`,
  );
});
console.log(`Artifact: ${path.relative(ROOT, artifactPath)}`);
