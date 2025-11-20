import { cosmiconfig } from 'cosmiconfig';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Default configuration
 */
const defaultConfig = {
  // Development settings
  dev: {
    composeFile: './compose/docker-compose.yml',
    profiles: ['default'],
    autoMigrate: true,
    autoSeed: false,
  },

  // Pipeline settings
  pipelines: {
    defaultEngine: 'maestro',
    workflowDir: './workflows',
  },

  // Deployment settings
  deploy: {
    defaultRegion: 'us-west-2',
    verifyImages: true,
  },

  // Output settings
  output: {
    defaultFormat: 'human',
    color: true,
    emoji: false,
  },

  // AI/Copilot settings
  copilot: {
    model: 'claude-3-5-sonnet-20241022',
    retriever: 'http://localhost:8765',
  },

  // Testing settings
  test: {
    smokeTimeout: 120000,
    e2eTimeout: 300000,
  },

  // Database settings
  db: {
    defaultTarget: 'all', // 'all', 'postgres', 'neo4j'
  },
};

/**
 * Load configuration from multiple sources with precedence:
 * 1. Command-line --config flag (handled by commander)
 * 2. ./summit.config.js (project-specific)
 * 3. ~/.summit/config.js (user-specific)
 * 4. Built-in defaults
 */
export async function loadConfig(configPath) {
  const explorer = cosmiconfig('summit', {
    searchPlaces: [
      'summit.config.js',
      'summit.config.cjs',
      'summit.config.mjs',
      'summit.config.json',
      '.summitrc',
      '.summitrc.json',
      '.summitrc.js',
      join(homedir(), '.summit', 'config.js'),
      join(homedir(), '.summit', 'config.json'),
    ],
  });

  let result;
  if (configPath) {
    result = await explorer.load(configPath);
  } else {
    result = await explorer.search();
  }

  const userConfig = result ? result.config : {};

  // Deep merge with defaults
  return deepMerge(defaultConfig, userConfig);
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}
