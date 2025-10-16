#!/usr/bin/env node
import { diff } from '@graphql-inspector/core';
import fs from 'node:fs';
import { parse } from 'graphql';

const nextSDL = fs.readFileSync('schema/schema.graphql', 'utf8');
const baseSDL = fs.readFileSync('schema/baseline.graphql', 'utf8');

const changes = await diff(parse(baseSDL), parse(nextSDL));
const breaking = changes.filter((c) => c.criticality?.level === 'BREAKING');
for (const c of breaking) console.error(`[BREAKING] ${c.path} — ${c.message}`);
if (breaking.length) process.exit(1);
console.log('No breaking schema changes.');
