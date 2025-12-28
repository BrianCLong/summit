import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type SchemaField = { name: string; type: 'string' | 'int64' | 'float64' | 'bool' };

export class DataLakeExportService {
  /**
   * Writes data to a Parquet file using a Python worker.
   */
  async writeParquet(
    rows: any[],
    schema: SchemaField[],
    outPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Resolve path relative to this file, which is more robust than cwd
      const pythonScript = join(__dirname, 'export/parquet_writer.py');

      if (!fs.existsSync(pythonScript)) {
          return reject(new Error(`Parquet writer script not found at ${pythonScript}. Ensure build pipeline copies .py files.`));
      }

      const child = spawn('python3', [pythonScript]);

      // Send data to python script via stdin
      const payload = JSON.stringify({ rows, schema, outPath });
      child.stdin.write(payload);
      child.stdin.end();

      let stderr = '';

      child.stdout.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg === 'SUCCESS') {
          // Good
        }
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Parquet writer failed: ${stderr}`));
        }
      });

      child.on('error', (err) => {
          reject(err);
      });
    });
  }
}
