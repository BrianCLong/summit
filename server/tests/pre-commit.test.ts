
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const SCRIPT_PATH = path.resolve(__dirname, '../scripts/generate-screenshots.ts');
const METADATA_PATH = path.resolve(__dirname, '../../docs/cookbook/screenshots/metadata.json');

describe('Pre-commit Screenshot Script', () => {
  it('should exit gracefully (code 0) when server is unreachable', (done) => {
    // Use a port that is definitely closed
    const env = { ...process.env, UI_URL: 'http://localhost:59999' };
    // We use npx tsx to execute the script
    exec(`npx tsx ${SCRIPT_PATH}`, { env }, (error, stdout, stderr) => {
      expect(error).toBeNull();

      // Verify metadata
      try {
        if (fs.existsSync(METADATA_PATH)) {
            const content = fs.readFileSync(METADATA_PATH, 'utf8');
            // If the script ran successfully, it should produce valid JSON
            const meta = JSON.parse(content);
            if (meta.status) {
                expect(meta.status).toBe('skipped');
                expect(meta.reason).toBe('server_down');
            }
        }
      } catch (e) {
        // If file doesn't exist or is invalid, that's a failure if we expected it to be created
        // But if the script fails early, it might not create it.
        // However, the script is designed to create it.
        throw e;
      }
      done();
    });
  }, 35000); // 35s timeout
});
