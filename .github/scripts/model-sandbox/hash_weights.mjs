import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';

async function hashFile(path) {
  const hash = createHash('sha256');
  const stream = createReadStream(path);
  return new Promise((resolve, reject) => {
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => {
        if (err.code === 'ENOENT') {
            resolve(null);
        } else {
            reject(err);
        }
    });
  });
}

if (process.argv[1].endsWith('hash_weights.mjs')) {
    const filePath = process.argv[2];
    if (!filePath) {
      console.error("Usage: node hash_weights.mjs <file_path>");
      process.exit(1);
    }

    hashFile(resolve(filePath))
      .then((hash) => {
        if (hash) {
            console.log(hash);
        } else {
            console.error(`File not found: ${filePath}`);
            process.exit(1);
        }
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
}

export { hashFile };
