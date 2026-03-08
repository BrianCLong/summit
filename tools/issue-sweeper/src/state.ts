import { promises as fs } from 'fs';

export interface State {
  repo: string;
  state_filter: 'all' | 'open' | 'closed';
  batch_size: number;
  cursor: {
    last_processed_issue_number: number;
    page: number;
  };
  run_started_at: string;
  run_updated_at: string;
  processed_count: number;
  error_count: number;
  failures: unknown[];
  open_prs: unknown[];
}

export function initState(
  repo: string,
  stateFilter: 'all' | 'open' | 'closed',
  batchSize: number,
): State {
  const now = new Date().toISOString();
  return {
    repo,
    state_filter: stateFilter,
    batch_size: batchSize,
    cursor: {
      last_processed_issue_number: 0,
      page: 1,
    },
    run_started_at: now,
    run_updated_at: now,
    processed_count: 0,
    error_count: 0,
    failures: [],
    open_prs: [],
  };
}

export async function loadState(
  stateFile: string,
  repo: string,
  stateFilter: 'all' | 'open' | 'closed',
  batchSize: number,
  reset: boolean,
): Promise<State> {
  if (reset) {
    console.log('Resetting state.');
    return initState(repo, stateFilter, batchSize);
  }

  try {
    const stateContent = await fs.readFile(stateFile, 'utf-8');
    const parsed = JSON.parse(stateContent) as State;

    if (
      parsed.repo !== repo ||
      parsed.state_filter !== stateFilter ||
      parsed.batch_size !== batchSize
    ) {
      console.log('Configuration changed, resetting state.');
      return initState(repo, stateFilter, batchSize);
    }

    return parsed;
  } catch {
    console.log('No state file found, initializing new state.');
    return initState(repo, stateFilter, batchSize);
  }
}

export async function saveState(stateFile: string, state: State) {
  state.run_updated_at = new Date().toISOString();
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
}
