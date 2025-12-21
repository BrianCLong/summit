// Thin wrapper; expects tesseract to be available in path for real runs; mocked in tests
import { spawn } from 'child_process';

export async function ocrPng(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn('tesseract', [path, 'stdout', '-l', 'eng']);
    let out = '';
    p.stdout.on('data', (d) => (out += d.toString()));
    p.on('close', (code) => (code === 0 ? resolve(out.trim()) : reject(new Error('ocr_failed'))));
  });
}
