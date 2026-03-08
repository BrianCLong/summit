import fs from 'fs-extra';
import path from 'path';

export interface RunManifest {
  run_id: string;
  agent_graph_version?: string;
  tool_versions?: Record<string, string>;
  model_parameters?: {
    model_name: string;
    temperature?: number;
    top_p?: number;
  };
  memory_snapshot_hashes?: Record<string, string>;
  policy_bundle_hash?: string;
  seed_values: {
    global_seed: number;
  };
  final_state_hash?: string;
  created_at: string;
}

/**
 * Generate a run manifest object.
 */
export function generateRunManifest(
  runId: string,
  seed: number,
  options: Partial<Omit<RunManifest, 'run_id' | 'seed_values' | 'created_at'>> = {}
): RunManifest {
  return {
    run_id: runId,
    seed_values: { global_seed: seed },
    created_at: new Date().toISOString(),
    ...options
  };
}

/**
 * Save the run manifest to a file.
 * Typically saved in the run directory (e.g. ~/.summit/runs/{runId}/manifest.json)
 */
export async function saveRunManifest(manifest: RunManifest, filePath: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJSON(filePath, manifest, { spaces: 2 });
}

/**
 * Load a run manifest from a file.
 */
export async function loadRunManifest(filePath: string): Promise<RunManifest> {
  if (!await fs.pathExists(filePath)) {
    throw new Error(`Manifest not found at ${filePath}`);
  }
  return fs.readJSON(filePath) as Promise<RunManifest>;
}
