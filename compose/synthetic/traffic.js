// Simple synthetic traffic generator hitting MC GraphQL
import { request } from 'undici';

const MC_URL = process.env.MC_URL || 'http://mc:4000/graphql';
const RATE_MS = Number(process.env.RATE_MS || 200);

async function tick() {
  try {
    const body = JSON.stringify({ query: '{ __typename }' });
    const res = await request(MC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    await res.body.text();
  } catch (e) {
    // swallow errors to keep load running
  }
}

async function main() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await tick();
    await new Promise((r) =>
      setTimeout(r, RATE_MS + Math.floor(Math.random() * RATE_MS)),
    );
  }
}

main().catch(() => process.exit(1));
