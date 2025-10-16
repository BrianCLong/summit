import { createClient } from '../../sdk/typescript/src/client';

const BASE_URL = 'http://localhost:8080'; // Replace with your Maestro API URL
const TOKEN = 'your_token_here'; // Replace with your actual token or leave undefined

async function main() {
  const client = createClient(BASE_URL, TOKEN);

  try {
    console.log('Listing runs...');
    const runs = await client.listRuns();
    console.log('Runs:', runs.data); // Assuming runs.data contains the array of runs

    // Start a new run
    console.log('\nStarting a new run...');
    const newRun = await client.startRun('my-pipeline-id', {
      estimatedCost: 0.05,
    }); // Assuming startRun takes pipelineId and params
    console.log('New Run ID:', newRun.id);

    // Tail run logs
    console.log('\nTailing logs for the new run (simplified)...');
    const logs = await client.tailRunLogs(newRun.id); // Assuming tailRunLogs takes runId
    console.log('Logs:', logs); // Simplified: logs might be a string or stream

    // Fetch evidence (placeholder)
    console.log('\nFetching evidence (conceptual)...');
    // const evidence = await client.fetchEvidence("evidence-id-123"); // Assuming fetchEvidence is available
    // console.log("Evidence:", evidence);
  } catch (error) {
    console.error('Error in SDK example:', error);
  }
}

main();
