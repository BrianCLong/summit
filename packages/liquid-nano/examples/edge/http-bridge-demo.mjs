#!/usr/bin/env node
import { startHttpBridge } from '../../dist/integration/httpBridge.js';

const server = startHttpBridge({
  port: 8080,
  onPersist: (payload) => {
    console.log('Persisted payload:', payload);
  }
});

console.log('Liquid Nano HTTP bridge listening on http://localhost:8080');

process.on('SIGINT', () => {
  server.close(() => {
    console.log('HTTP bridge stopped');
    process.exit(0);
  });
});
