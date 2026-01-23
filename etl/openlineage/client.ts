import { OpenLineageClient } from 'openlineage-client';
export const ol = new OpenLineageClient({
  url: process.env.OL_URL!,
  apiKey: process.env.OL_TOKEN!,
});
export function emitRun(job: string, inputs: string[], outputs: string[]) {
  /* emit start/complete with datasets */
}
