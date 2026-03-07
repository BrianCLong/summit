import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';

/**
 * Computes the SHA256 hash of a file deterministically.
 */
export async function computeFileHash(filepath) {
  try {
    await access(filepath);
  } catch {
    throw new Error(`File not found: ${filepath}`);
  }

  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filepath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

if (process.argv[1] === import.meta.url.slice(7)) {
  const filepath = process.argv[2];
  if (!filepath) {
    console.error('Usage: node hash_weights.mjs <filepath>');
    process.exit(1);
  }
  computeFileHash(filepath)
    .then((hash) => console.log(hash))
    .catch((err) => {
      console.error(err.message);
      process.exit(1);
    });
}
