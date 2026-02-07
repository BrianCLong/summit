import http from 'node:http';
import process from 'node:process';
import { LocalLmStudioProvider } from '../../src/agents/providers/localLmStudioProvider.js';

const server = http.createServer((req, res) => {
  if (req.url?.includes('/chat/completions')) {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        choices: [{ message: { content: 'contract-ok' } }],
      }),
    );
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'not-found' }));
});

async function run(): Promise<void> {
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start mock server');
  }

  const baseUrl = `http://127.0.0.1:${address.port}/v1`;
  const provider = new LocalLmStudioProvider({ baseUrl });
  const response = await provider.chat({
    model: 'qwen3-coder-next',
    messages: [{ role: 'user', content: 'ping' }],
  });

  if (response.text !== 'contract-ok') {
    throw new Error(`Unexpected provider response: ${response.text}`);
  }

  server.close();
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  server.close();
  process.exit(1);
});
