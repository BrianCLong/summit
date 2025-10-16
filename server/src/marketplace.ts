import { execFile } from 'node:child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { verifyCosign } from './plugins/verify.js';

function exec(bin: string, args: string[]) {
  return new Promise<void>((res, rej) =>
    execFile(bin, args, (e) => (e ? rej(e) : res())),
  );
}

export async function installStep(name: string, version: string) {
  const offline = (process.env.OFFLINE || 'false').toLowerCase() === 'true';
  const pluginsDir = path.join(process.cwd(), 'plugins');
  await fs.mkdir(pluginsDir, { recursive: true });
  const ref =
    process.env.MARKETPLACE_REGISTRY || `ghcr.io/intelgraph/${name}:${version}`;
  if (!offline) {
    if (!(await verifyCosign(ref)))
      throw new Error('signature verification failed');
    try {
      await exec('oras', ['pull', ref, '-o', pluginsDir]);
    } catch (e) {
      throw new Error(`oras pull failed: ${String((e as Error).message || e)}`);
    }
  }
  const wasmFile = path.join(pluginsDir, `${name}.wasm`);
  await fs.access(wasmFile);
  return wasmFile;
}
