import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const run = (command) => {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (e) {
    console.error(`Failed to execute command: ${command}`);
    return null;
  }
};

const getAllIssues = () => {
    console.log("Fetching all open issues with pagination...");
    let issues = [];
    let page = 1;
    while (true) {
        const command = `gh issue list --limit 100 --page ${page} --json number,title,labels`;
        const result = run(command);
        if (!result) {
            break; // Error occurred
        }
        const pageIssues = JSON.parse(result);
        if (pageIssues.length === 0) {
            break; // No more issues
        }
        issues = issues.concat(pageIssues);
        page++;
    }
    return issues;
}

const main = () => {
  const outputPath = path.resolve(process.cwd(), 'artifacts/orchestration/backlog_analysis.json');
  const issues = getAllIssues();

  const analysis = {
    parallelizable_groups: {},
    dependency_graph: {
        // Placeholder: Implementing a full dependency graph is a complex task.
        // This would involve parsing issue bodies for "blocks" or "depends on" keywords.
        nodes: [],
        edges: [],
    },
    agent_routing_recommendations: {},
    estimated_velocity_multiplier: 1.0, // Placeholder
  };

  const tasksByComponent = {};
  const routing = {};

  for (const issue of issues) {
    const componentLabel = issue.labels.find(label => label.name.startsWith('component:'));
    const typeLabel = issue.labels.find(label => label.name.startsWith('type:'));

    const component = componentLabel ? componentLabel.name.replace('component:', '') : 'Uncategorized';
    const type = typeLabel ? typeLabel.name.replace('type:', '') : 'Feature';

    if (!tasksByComponent[component]) {
      tasksByComponent[component] = [];
    }
    tasksByComponent[component].push({ title: issue.title, component, type });

    // Agent routing recommendations
    let agent = 'Codex'; // default
    if (type === 'Governance' || type === 'Ops' || type === 'Security' || component.includes('Core')) {
      agent = 'Jules';
    } else if (type === 'Doc') {
      agent = 'Quick Wins';
    }
    routing[issue.title] = agent;
  }

  analysis.parallelizable_groups = tasksByComponent;
  analysis.agent_routing_recommendations = routing;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));

  console.log(`Backlog analysis complete with ${issues.length} issues. Output written to ${outputPath}`);
};

main();
