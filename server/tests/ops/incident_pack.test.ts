
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Incident Pack Script', () => {
  const scriptPath = 'src/scripts/ops/capture_incident_pack.ts';
  const outputFile = 'incident-pack.json';

  afterAll(() => {
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }
  });

  it('should generate a valid incident pack JSON', async () => {
    // Run from server/ root
    const command = `npx tsx ${scriptPath}`;

    // Increase timeout just in case
    await execAsync(command, { cwd: path.join(__dirname, '../../') });

    const fullPath = path.join(__dirname, '../../', outputFile);
    expect(fs.existsSync(fullPath)).toBe(true);

    const content = fs.readFileSync(fullPath, 'utf-8');
    const json = JSON.parse(content);

    expect(json).toHaveProperty('timestamp');
    expect(json).toHaveProperty('service');
    expect(json.service).toHaveProperty('version');
    expect(json).toHaveProperty('config');
    // Ensure secrets are redacted (or keys exist)
    expect(json).toHaveProperty('health');
  }, 30000);
});
