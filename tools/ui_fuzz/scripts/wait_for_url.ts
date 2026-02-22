import http from 'node:http';
import https from 'node:https';

const url = process.argv[2];
const timeoutMs = Number.parseInt(process.argv[3] || '60000', 10);
const start = Date.now();

if (!url) {
  throw new Error('wait_for_url requires a URL argument');
}

const fetchOnce = (target: string) =>
  new Promise<void>((resolve, reject) => {
    const client = target.startsWith('https') ? https : http;
    const request = client.get(target, (response) => {
      response.resume();
      if (response.statusCode && response.statusCode >= 200 && response.statusCode < 500) {
        resolve();
        return;
      }
      reject(new Error(`Unexpected status ${response.statusCode}`));
    });
    request.on('error', reject);
  });

const waitFor = async () => {
  while (Date.now() - start < timeoutMs) {
    try {
      await fetchOnce(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`Timeout waiting for ${url}`);
};

waitFor();
