import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { execSync } from 'node:child_process';

function loadConfig(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');

  // Simple manual parser for the specific structure we wrote
  // This avoids dependency issues in the sandbox.

  const config = {
    inputs: {},
    stages: {},
    preconditions: {}
  };

  const lines = content.split('\n');
  let currentSection = null;
  let currentItem = null;

  for (const line of lines) {
    // Preserve indentation for logic but trim for checks
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Detect sections (no indentation)
    if (line.match(/^[a-z]+:/)) {
       const sectionName = trimmed.replace(':', '');
       if (['inputs', 'stages', 'preconditions'].includes(sectionName)) {
           currentSection = sectionName;
           continue;
       }
    }

    // Detect items (2 spaces indentation)
    if (currentSection && line.match(/^  [a-z_]+:/)) {
      const key = trimmed.replace(':', '');
      currentItem = key;
      config[currentSection][key] = {};
      continue;
    }

    // Detect properties (4 spaces indentation)
    if (currentSection && currentItem && line.match(/^    [a-z_]+:/)) {
      // Property of item
      const parts = trimmed.split(':');
      const key = parts[0].trim();
      let val = parts.slice(1).join(':').trim();

      let value = val;
      if (val === 'true') value = true;
      if (val === 'false') value = false;
      if (val.startsWith('[') && val.endsWith(']')) {
         value = val.slice(1, -1).split(',').map(s => s.trim().replace(/"/g, ''));
      }

      if (key && value !== undefined) {
         config[currentSection][currentItem][key] = value;
      }
      continue;
    }

    // Handle list items (artifacts) - looking for indentation
    if (currentSection && currentItem && line.match(/^      - /)) {
         if (!config[currentSection][currentItem].artifacts) {
            config[currentSection][currentItem].artifacts = [];
         }
         config[currentSection][currentItem].artifacts.push(trimmed.substring(2).replace(/"/g, ''));
         continue;
    }
  }
  return config;
}


const ARGS_OPTIONS = {
  target: { type: 'string' },
  channel: { type: 'string' },
  mode: { type: 'string' }, // dry-run | apply
  help: { type: 'boolean' },
};

function main() {
  const { values } = parseArgs({ args: process.argv.slice(2), options: ARGS_OPTIONS });

  if (values.help) {
    console.log(`Usage: node plan_ga_cut.mjs --target=<sha> --channel=<ga|rc> --mode=<dry-run|apply>`);
    process.exit(0);
  }

  const targetSha = values.target || 'HEAD';
  const channel = values.channel || 'ga';
  const mode = values.mode || 'dry-run';

  if (!['dry-run', 'apply'].includes(mode)) {
    console.error(`Invalid mode: ${mode}. Must be 'dry-run' or 'apply'.`);
    process.exit(1);
  }

  // Resolve SHA
  let sha = targetSha;
  try {
     sha = execSync(`git rev-parse ${targetSha}`).toString().trim();
  } catch (e) {
     console.error(`Could not resolve SHA for ${targetSha}`);
     process.exit(1);
  }

  console.log(`Planning GA Cut for SHA: ${sha} (Mode: ${mode})`);

  // Load Config
  const configPath = path.join(process.cwd(), 'configs/release/ga-cut-plan.yaml');
  const config = loadConfig(configPath);

  // Generate Plan
  const plan = {
    meta: {
      generated_at: new Date().toISOString(),
      target_sha: sha,
      channel,
      mode,
    },
    preconditions: [],
    stages: []
  };

  // Process Preconditions
  if (config.preconditions) {
      for (const [key, def] of Object.entries(config.preconditions)) {
        plan.preconditions.push({
          id: key,
          description: def.description,
          script: def.script,
          check_required: true
        });
      }
  }

  // Process Stages
  if (config.stages) {
      for (const [key, def] of Object.entries(config.stages)) {
        const willRun = mode === 'apply' || (mode === 'dry-run' && def.allowed_in_dry_run);
        const mutation = !def.allowed_in_dry_run;

        plan.stages.push({
          id: key,
          description: def.description,
          required: def.required,
          blocking: def.blocking,
          will_run: willRun,
          is_mutation: mutation,
          artifacts: def.artifacts || []
        });
      }
  }

  // Ensure output directory exists
  const outDir = path.join(process.cwd(), 'artifacts/release/ga-cut');
  fs.mkdirSync(outDir, { recursive: true });

  const filenameBase = `PLAN_${sha}_${mode}`;
  const jsonPath = path.join(outDir, `${filenameBase}.json`);
  const mdPath = path.join(outDir, `${filenameBase}.md`);

  // Write JSON
  fs.writeFileSync(jsonPath, JSON.stringify(plan, null, 2));

  // Write Markdown
  let mdContent = `# GA Cut Plan: ${channel.toUpperCase()} ${mode.toUpperCase()}\n\n`;
  mdContent += `**Target SHA:** \`${sha}\`\n`;
  mdContent += `**Generated At:** ${plan.meta.generated_at}\n\n`;

  mdContent += `## Preconditions\n`;
  if (plan.preconditions.length === 0) {
    mdContent += `_None_\n`;
  } else {
    plan.preconditions.forEach(p => {
      mdContent += `- [ ] **${p.id}**: ${p.description} (Script: \`${p.script}\`)\n`;
    });
  }
  mdContent += `\n`;

  mdContent += `## Stages\n`;
  plan.stages.forEach(stage => {
    const icon = stage.will_run ? '✅' : 'zzz';
    const mutationLabel = stage.is_mutation ? ' (Mutating)' : '';
    mdContent += `### ${icon} ${stage.id}${mutationLabel}\n`;
    mdContent += `- **Description**: ${stage.description}\n`;
    mdContent += `- **Will Run**: ${stage.will_run}\n`;
    mdContent += `- **Blocking**: ${stage.blocking}\n`;
    if (stage.artifacts.length > 0) {
      mdContent += `- **Expected Artifacts**:\n`;
      stage.artifacts.forEach(a => mdContent += `  - \`${a}\`\n`);
    }
    mdContent += `\n`;
  });

  fs.writeFileSync(mdPath, mdContent);

  console.log(`Plan generated:\n  JSON: ${jsonPath}\n  MD: ${mdPath}`);
}

main();
