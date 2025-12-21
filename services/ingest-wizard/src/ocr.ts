import fs from 'fs';
import { spawn } from 'child_process';

export type OcrOptions = { lang?: string; timeoutMs?: number };

export async function ocrPng(filePath: string, options: OcrOptions = {}): Promise<string> {
  await fs.promises.access(filePath, fs.constants.R_OK);

  return new Promise((resolve, reject) => {
    const lang = options.lang ?? 'eng';
    const p = spawn('tesseract', [filePath, 'stdout', '-l', lang]);
    let out = '';
    let errMsg = '';
    const timeout = options.timeoutMs
      ? setTimeout(() => {
          p.kill('SIGKILL');
          reject(new Error('ocr_timeout'));
        }, options.timeoutMs)
      : undefined;

    p.stdout.on('data', (d) => (out += d.toString()));
    p.stderr.on('data', (d) => (errMsg += d.toString()));
    p.on('error', (err) => reject(err));
    p.on('close', (code) => {
      if (timeout) clearTimeout(timeout);
      if (code === 0) resolve(out.trim());
      else reject(new Error(errMsg || 'ocr_failed'));
    });
  });
}
