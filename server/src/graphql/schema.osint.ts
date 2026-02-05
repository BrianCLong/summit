// server/src/graphql/schema.osint.ts

import gqlModule from 'graphql-tag';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const gql = (gqlModule as any).default || gqlModule;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sdl = readFileSync(path.join(__dirname, 'schema.osint.graphql'), 'utf8');

export const osintTypeDefs = gql(sdl);
