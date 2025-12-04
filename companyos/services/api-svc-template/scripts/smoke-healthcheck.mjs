#!/usr/bin/env node
const target = process.env.HEALTH_URL ?? 'http://localhost:4000/health';

async function main() {
  const res = await fetch(target);
  if (!res.ok) {
    console.error(`Healthcheck failed: ${res.status}`);
    process.exit(1);
  }
  const body = await res.json();
  console.log('Healthcheck passed', body);
}

main().catch((err) => {
  console.error('Healthcheck error', err);
  process.exit(1);
});
