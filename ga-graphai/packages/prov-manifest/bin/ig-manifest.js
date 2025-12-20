#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

const rootDir = path.dirname(new URL('../', import.meta.url).pathname);
const distCli = path.join(rootDir, 'dist', 'cli.js');
const sourceCli = path.join(rootDir, 'src', 'cli.js');

const entry = existsSync(distCli) ? distCli : sourceCli;
await import(pathToFileURL(entry).href);
