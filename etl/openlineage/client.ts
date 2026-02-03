import { OpenLineageClient } from 'openlineage-client';
const olUrl = process.env.OL_URL;
const olToken = process.env.OL_TOKEN;

if (!olUrl) {
  throw new Error('OL_URL environment variable is required');
}

if (!olToken) {
  throw new Error('OL_TOKEN environment variable is required');
}

export const ol = new OpenLineageClient({
  url: olUrl,
  apiKey: olToken,
});
export function emitRun(_job: string, _inputs: string[], _outputs: string[]) {
  /* emit start/complete with datasets */
}
