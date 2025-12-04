/**
 * Promise Tracker - Init Module
 *
 * Initializes the promise tracker in a repository.
 */

import { mkdir, writeFile, access } from 'fs/promises';
import { join } from 'path';
import type { BacklogDatabase } from './schema.js';

const DATA_DIR = join(process.cwd(), '.promise-tracker');

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG = {
  version: '1.0.0',
  github: {
    owner: 'BrianCLong',
    repo: 'summit',
    labels: {
      'promise-tracked': {
        color: '5319e7',
        description: 'Tracked by Promise Tracker system',
      },
      'component:summit': { color: '0366d6', description: 'Summit platform' },
      'component:companyos': { color: '0366d6', description: 'CompanyOS system' },
      'component:maestro': { color: '0366d6', description: 'Maestro orchestration' },
      'component:switchboard': { color: '0366d6', description: 'Switchboard console' },
      'component:intelgraph': { color: '0366d6', description: 'IntelGraph analytics' },
      'component:conductor': { color: '0366d6', description: 'Conductor service' },
    },
  },
  extraction: {
    excludePaths: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/archive/**',
      '**/.archive/**',
    ],
    codeExtensions: ['ts', 'tsx', 'js', 'jsx', 'py', 'sh', 'go', 'rs'],
    docExtensions: ['md'],
  },
  health: {
    thresholds: {
      minValidationRate: 50,
      maxStaleInProgress: 5,
      maxMissingAcceptanceCriteria: 10,
    },
  },
};

// =============================================================================
// Initialization
// =============================================================================

export async function initializeTracker(): Promise<void> {
  console.log('Initializing promise tracker...\n');

  // Create data directory
  await mkdir(DATA_DIR, { recursive: true });
  console.log(`  Created: ${DATA_DIR}`);

  // Create config file
  const configPath = join(DATA_DIR, 'config.json');
  try {
    await access(configPath);
    console.log(`  Exists: ${configPath}`);
  } catch {
    await writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log(`  Created: ${configPath}`);
  }

  // Create empty backlog
  const backlogPath = join(DATA_DIR, 'backlog.json');
  try {
    await access(backlogPath);
    console.log(`  Exists: ${backlogPath}`);
  } catch {
    const emptyBacklog: BacklogDatabase = {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      epics: [],
      items: [],
      staging: [],
    };
    await writeFile(backlogPath, JSON.stringify(emptyBacklog, null, 2));
    console.log(`  Created: ${backlogPath}`);
  }

  // Create .gitignore for sensitive data
  const gitignorePath = join(DATA_DIR, '.gitignore');
  try {
    await access(gitignorePath);
  } catch {
    const gitignoreContent = `# Promise Tracker
# Keep staging.json tracked so team can review captured items
# Keep backlog.json tracked for team visibility

# Ignore temporary files
*.tmp
*.log
`;
    await writeFile(gitignorePath, gitignoreContent);
    console.log(`  Created: ${gitignorePath}`);
  }

  // Create README
  const readmePath = join(DATA_DIR, 'README.md');
  try {
    await access(readmePath);
  } catch {
    const readmeContent = `# Promise Tracker Data

This directory contains data for the Promise Tracker system.

## Files

- \`config.json\` - Configuration for extraction and sync
- \`backlog.json\` - Tracked backlog items with Definition of Done status
- \`staging.json\` - Captured items awaiting conversion to issues

## Usage

\`\`\`bash
# Extract promises from codebase
pnpm promise-tracker extract

# View health metrics
pnpm promise-tracker health

# Generate report
pnpm promise-tracker report --format markdown

# Sync to GitHub (dry run first!)
pnpm promise-tracker sync --dry-run
pnpm promise-tracker sync --limit 5
\`\`\`

## Definition of Done

Every feature tracked by this system must complete:

1. Code merged to main
2. Tests exist and pass
3. Feature exposed in UI/API/CLI
4. Docs updated
5. Telemetry wired
6. Deployed to staging
7. Deployed to production
8. Validated with real usage

Only then is an item considered "totally delivered".
`;
    await writeFile(readmePath, readmeContent);
    console.log(`  Created: ${readmePath}`);
  }

  console.log('\nPromise tracker initialized!');
}

export default initializeTracker;
