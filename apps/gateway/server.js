/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const fs = require('fs');

const distPath = path.join(__dirname, 'dist', 'server.js');

if (fs.existsSync(distPath)) {
  require(distPath);
} else {
  // Fallback for dev/tools
  console.warn('Production build not found, falling back to src/server.js (this might fail if not using ts-node)');
  require('./src/server.js');
}
