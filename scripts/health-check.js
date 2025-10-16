#!/usr/bin/env node

const http = require('http');
const https = require('https');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/health-check.js <url>');
  process.exit(1);
}

const url = new URL(target);
const client = url.protocol === 'https:' ? https : http;
const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname + url.search,
  method: 'GET',
  timeout: 5000,
};

const request = client.request(options, (response) => {
  if (response.statusCode && response.statusCode < 400) {
    process.exit(0);
  } else {
    console.error(`Health check failed: ${response.statusCode}`);
    process.exit(1);
  }
});

request.on('error', (error) => {
  console.error('Health check error:', error.message);
  process.exit(1);
});

request.on('timeout', () => {
  console.error('Health check timeout');
  request.destroy();
  process.exit(1);
});

request.end();
