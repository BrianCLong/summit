import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

const DEFAULT_SCHEMA_PATH = path.join(repoRoot, 'lab/recipes/schema.json');
const DEFAULT_POLICY_PATH = path.join(repoRoot, 'policies/lab.yml');
const DEFAULT_RECIPE_DIR = path.join(repoRoot, 'lab/recipes');

const args = process.argv.slice(2);
const flags = new Map();

for (const arg of args) {
  if (arg.startsWith('--')) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    flags.set(key, value ?? true);
  }
}

const recipeArg = flags.get('recipe');
const dryRun = Boolean(flags.get('dry-run'));

if (!recipeArg) {
  console.error('Missing --recipe argument.');
  process.exit(1);
}

const readJson = async (filePath) => {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

const loadPolicy = async () => {
  const raw = await fs.readFile(DEFAULT_POLICY_PATH, 'utf8');
  return yaml.load(raw);
};

const loadRecipeById = async (recipeId) => {
  const entries = await fs.readdir(DEFAULT_RECIPE_DIR);
  for (const entry of entries) {
    if (!entry.endsWith('.json')) {
      continue;
    }
    const filePath = path.join(DEFAULT_RECIPE_DIR, entry);
    const recipe = await readJson(filePath);
    if (recipe.id === recipeId) {
      return { recipe, filePath };
    }
  }
  return null;
};

const resolveRecipe = async () => {
  if (recipeArg.includes('/') || recipeArg.endsWith('.json')) {
    const resolvedPath = path.isAbsolute(recipeArg)
      ? recipeArg
      : path.join(repoRoot, recipeArg);
    return { recipe: await readJson(resolvedPath), filePath: resolvedPath };
  }

  const match = await loadRecipeById(recipeArg);
  if (!match) {
    throw new Error(`Recipe ${recipeArg} not found in ${DEFAULT_RECIPE_DIR}.`);
  }
  return match;
};

const ensureDatasetFiles = async (datasetReferences) => {
  const details = [];
  for (const dataset of datasetReferences) {
    const datasetPath = path.join(repoRoot, dataset);
    try {
      const stat = await fs.stat(datasetPath);
      details.push({ dataset, bytes: stat.size });
    } catch (error) {
      throw new Error(`Dataset not found: ${dataset}`);
    }
  }
  return details;
};

const seedRng = (seed) => {
  let state = seed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

const buildSlug = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const main = async () => {
  const { recipe, filePath } = await resolveRecipe();
  const schema = await readJson(DEFAULT_SCHEMA_PATH);
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(recipe);
  if (!valid) {
    console.error('Recipe schema validation failed.');
    console.error(ajv.errorsText(validate.errors, { separator: '\n' }));
    process.exit(1);
  }

  const policy = await loadPolicy();
  const labPolicy = policy?.lab;
  if (!labPolicy?.enabled) {
    throw new Error('Lab policy disabled. Enable policies/lab.yml before running.');
  }

  const recipeProfile = recipe.runParameters?.profile || labPolicy.default_profile;
  const envProfile = process.env.LAB_PROFILE || process.env.SUMMIT_PROFILE;

  if (labPolicy.allow_live_connectors === false && recipeProfile !== 'lab') {
    throw new Error('Lab policy forbids non-lab profiles.');
  }

  if (envProfile && envProfile !== recipeProfile) {
    throw new Error(`Environment profile ${envProfile} does not match recipe profile ${recipeProfile}.`);
  }

  const datasetDetails = await ensureDatasetFiles(recipe.datasetReferences);
  const plan = {
    recipe: recipe.id,
    recipeFile: path.relative(repoRoot, filePath),
    profile: recipeProfile,
    datasets: datasetDetails,
    pipelines: recipe.pipelines.map((pipeline) => pipeline.id),
    metrics: recipe.evaluationMetrics.map((metric) => metric.id),
  };

  if (dryRun) {
    console.log('DRY RUN: planned actions');
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const seed = recipe.runParameters?.seed ?? 1;
  const rng = seedRng(seed);
  const pipelineResults = recipe.pipelines.map((pipeline, index) => {
    const latencyMs = Math.round((rng() * 900 + 100) * (index + 1));
    const resultCount = Math.round(rng() * 120 + 20);
    return {
      id: pipeline.id,
      latencyMs,
      resultCount,
      status: 'ok',
      query: pipeline.query,
    };
  });

  const metrics = {
    runId: new Date().toISOString(),
    recipeId: recipe.id,
    profile: recipeProfile,
    datasets: datasetDetails,
    pipelineMetrics: pipelineResults,
    evaluationMetrics: recipe.evaluationMetrics.map((metric, index) => {
      const value = Number((rng() * 0.5 + 0.4 + index * 0.02).toFixed(2));
      return {
        id: metric.id,
        type: metric.type,
        target: metric.target ?? null,
        value,
      };
    }),
  };

  const results = {
    recipeId: recipe.id,
    executedAt: new Date().toISOString(),
    summary: {
      datasetsLoaded: datasetDetails.length,
      pipelinesExecuted: pipelineResults.length,
    },
    pipelines: pipelineResults,
  };

  const timestamp = new Date().toISOString().replace(/[:]/g, '-');
  const runDir = path.join(
    repoRoot,
    'artifacts/lab/runs',
    buildSlug(recipe.id),
    timestamp,
  );
  await fs.mkdir(runDir, { recursive: true });
  await fs.writeFile(
    path.join(runDir, 'results.json'),
    JSON.stringify(results, null, 2),
  );
  await fs.writeFile(
    path.join(runDir, 'metrics.json'),
    JSON.stringify(metrics, null, 2),
  );

  const runLog = `# Lab Run Log\n\n- Recipe: ${recipe.id}\n- Profile: ${recipeProfile}\n- Datasets: ${datasetDetails.map((dataset) => dataset.dataset).join(', ')}\n- Pipelines: ${pipelineResults.map((pipeline) => pipeline.id).join(', ')}\n\n## Notes\n- NOTE: Lab run captured via scripted runner.\n- TODO: Replace simulated pipeline execution with live IntelGraph query wiring.\n`;
  await fs.writeFile(path.join(runDir, 'run_log.md'), runLog);

  console.log(`Lab run complete: ${path.relative(repoRoot, runDir)}`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
