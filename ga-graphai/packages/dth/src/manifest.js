import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';
import toml from 'toml';

const EXTENSION_FORMAT = {
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml'
};

const PARSERS = {
  json: (content) => JSON.parse(content),
  yaml: (content) => yaml.load(content),
  toml: (content) => toml.parse(content)
};

function parseManifestString(raw, preferredFormat) {
  const attempts = preferredFormat ? [preferredFormat, 'json', 'yaml', 'toml'] : ['json', 'yaml', 'toml'];
  const tried = new Set();
  for (const format of attempts) {
    if (!PARSERS[format] || tried.has(format)) {
      continue;
    }
    tried.add(format);
    try {
      const manifest = PARSERS[format](raw);
      if (manifest && typeof manifest === 'object') {
        return { manifest, format };
      }
      throw new Error(`Manifest parser for ${format} returned non-object data.`);
    } catch (error) {
      if (format === preferredFormat) {
        continue;
      }
      if (attempts.at(-1) === format) {
        throw error;
      }
    }
  }
  throw new Error('Unable to parse manifest. Supported formats: JSON, YAML, TOML.');
}

function loadManifest(manifestPath) {
  const resolvedPath = path.resolve(manifestPath);
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const extension = path.extname(resolvedPath).toLowerCase();
  const preferredFormat = EXTENSION_FORMAT[extension];
  const { manifest, format } = parseManifestString(raw, preferredFormat);
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Manifest did not produce an object.');
  }
  const stats = fs.statSync(resolvedPath);
  const rawHash = createHash('sha256').update(raw).digest('hex');
  return {
    manifest,
    raw,
    format,
    preferredFormat,
    path: resolvedPath,
    stats,
    rawHash
  };
}

export { loadManifest, parseManifestString };
