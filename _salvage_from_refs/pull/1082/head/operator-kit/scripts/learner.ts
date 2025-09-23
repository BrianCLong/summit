import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { planRoute } from '../server/routes/plan';
import { Policy } from '../server/types/policy';
import { loadPolicy } from '../server/policy';

// Mock Request and Response objects for planRoute
const mockReq = (body: any) => ({
  body: body,
  app: { get: (key: string) => (key === 'policy' ? loadPolicy() : undefined) },
});
const mockRes = () => {
  let _json: any;
  let _status: number;
  return {
    json: (data: any) => { _json = data; },
    status: (code: number) => { _status = code; return mockRes(); },
    getJson: () => _json,
    getStatus: () => _status,
  };
};

async function runShadowMode() {
  const logFilePath = path.join(__dirname, '../server/access.log'); // Adjust path as needed
  const rl = readline.createInterface({
    input: fs.createReadStream(logFilePath),
    crlfDelay: Infinity,
  });

  console.log('Starting learner in shadow mode...');

  for await (const line of rl) {
    try {
      // Example: Parse lines that represent route.execute calls
      // This is a very naive parser; a real one would be more robust
      if (line.includes('POST /route/execute')) {
        // Extract relevant info from the log line (e.g., request body)
        // This part is highly dependent on your log format
        // For now, we'll just simulate a generic request
        const simulatedRequestBody = {
          task: 'qa',
          input: 'simulated input',
          env: 'dev',
          loa: 1,
          meta: {},
          controls: {},
        };

        const req = mockReq(simulatedRequestBody);
        const res = mockRes();

        // Run planRoute in shadow mode
        await planRoute(req as any, res as any);

        // Log the shadow decision (without affecting live routing)
        console.log('Shadow decision:', res.getJson());
      }
    } catch (error) {
      console.error('Error processing log line:', line, error);
    }
  }
  console.log('Learner finished.');
}

runShadowMode();
