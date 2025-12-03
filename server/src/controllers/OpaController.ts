import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

const POLICY_DIR = path.resolve(process.cwd(), '../policy'); // Assuming server is running from server/ directory? No, usually process.cwd() is repo root in this sandbox, but let's check.
// In the sandbox, process.cwd() is likely the repo root.
// However, the server code often assumes it's running from `server/`.
// Let's use absolute paths based on `process.cwd()`.

// Helper to find OPA binary
const findOPA = async (): Promise<string> => {
  // Check common locations or PATH
  const locations = [
    'opa', // PATH
    './opa',
    './server/bin/opa',
    '/usr/local/bin/opa'
  ];

  for (const loc of locations) {
    try {
      await new Promise((resolve, reject) => {
        const proc = spawn(loc, ['version']);
        proc.on('error', reject);
        proc.on('close', (code) => {
          if (code === 0) resolve(true);
          else reject(new Error('Non-zero exit'));
        });
      });
      return loc;
    } catch (e) {
      // ignore
    }
  }
  return 'opa'; // Default to PATH and hope for the best
};

export class OpaController {

  static async getPolicies(req: Request, res: Response) {
    try {
      // Verify policy dir exists
      try {
        await fs.access(POLICY_DIR);
      } catch (e) {
        // Fallback to relative path if process.cwd() is different
        // If we are in server/, policy is ../policy
        // If we are in root, policy is ./policy
      }

      const realPolicyDir = (await fs.stat('policy').catch(() => false)) ? 'policy' : '../policy';

      const files = await fs.readdir(realPolicyDir);
      const regoFiles = files.filter(f => f.endsWith('.rego'));
      res.json({ policies: regoFiles });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getPolicyContent(req: Request, res: Response) {
    try {
      const { filename } = req.params;
      if (!filename || !filename.endsWith('.rego')) {
        return res.status(400).json({ error: 'Invalid filename' });
      }

      const realPolicyDir = (await fs.stat('policy').catch(() => false)) ? 'policy' : '../policy';
      const filepath = path.join(realPolicyDir, filename);

      // Prevent directory traversal
      if (!filepath.startsWith(path.resolve(realPolicyDir))) {
         return res.status(403).json({ error: 'Access denied' });
      }

      const content = await fs.readFile(filepath, 'utf-8');
      res.json({ content });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async evaluatePolicy(req: Request, res: Response) {
    const { policy, input, entrypoint } = req.body;

    if (!policy) {
      return res.status(400).json({ error: 'Policy content is required' });
    }

    const tmpDir = os.tmpdir();
    const id = uuidv4();
    const policyFile = path.join(tmpDir, `${id}.rego`);
    const inputFile = path.join(tmpDir, `${id}.json`);

    try {
      await fs.writeFile(policyFile, policy);
      await fs.writeFile(inputFile, JSON.stringify(input || {}));

      const opaCmd = await findOPA();

      // opa eval -i input.json -d policy.rego "data"
      const args = ['eval', '-i', inputFile, '-d', policyFile, entrypoint || 'data'];

      const result = await new Promise<string>((resolve, reject) => {
        const proc = spawn(opaCmd, args);
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => stdout += data.toString());
        proc.stderr.on('data', (data) => stderr += data.toString());

        proc.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`OPA exited with code ${code}: ${stderr}`));
          } else {
            resolve(stdout);
          }
        });

        proc.on('error', (err) => {
           reject(new Error(`Failed to start OPA: ${err.message}`));
        });
      });

      res.json(JSON.parse(result));

    } catch (error: any) {
      // If OPA is missing, return a mock response for testing if requested
      if (error.message.includes('ENOENT') || error.message.includes('Failed to start OPA')) {
         return res.status(500).json({
           error: 'OPA binary not found',
           details: error.message,
           suggestion: 'Please install OPA or ensure it is in the PATH.'
         });
      }
      res.status(500).json({ error: error.message });
    } finally {
      // Cleanup
      await fs.unlink(policyFile).catch(() => {});
      await fs.unlink(inputFile).catch(() => {});
    }
  }

  static async validatePolicy(req: Request, res: Response) {
      const { policy } = req.body;
      if (!policy) {
          return res.status(400).json({ error: 'Policy content is required' });
      }

      const tmpDir = os.tmpdir();
      const id = uuidv4();
      const policyFile = path.join(tmpDir, `${id}.rego`);

      try {
          await fs.writeFile(policyFile, policy);
          const opaCmd = await findOPA();

          // opa check policy.rego
          const args = ['check', policyFile];

          await new Promise<void>((resolve, reject) => {
              const proc = spawn(opaCmd, args);
              let stderr = '';
              proc.stderr.on('data', (data) => stderr += data.toString());
              proc.on('close', (code) => {
                  if (code !== 0) reject(new Error(stderr || 'Validation failed'));
                  else resolve();
              });
              proc.on('error', (err) => reject(err));
          });

          res.json({ valid: true });

      } catch (error: any) {
          res.json({ valid: false, error: error.message });
      } finally {
          await fs.unlink(policyFile).catch(() => {});
      }
  }
}
