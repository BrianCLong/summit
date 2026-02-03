/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const fs = require('fs');

// Load instrumentation before everything else
const distInstrumentation = path.join(__dirname, 'dist', 'instrumentation.js');
if (fs.existsSync(distInstrumentation)) {
  try {
    console.log('Loading OTel instrumentation...');
    require(distInstrumentation);
  } catch (err) {
    console.error('Failed to load instrumentation:', err);
  }
}

const distPath = path.join(__dirname, 'dist', 'server.js');
const port = process.env.PORT || 8080;

let appModule;
if (fs.existsSync(distPath)) {
  appModule = require(distPath);
} else {
  // Fallback for dev/tools
  console.warn('Production build not found, falling back to src/server.js (this might fail if not using ts-node)');
  appModule = require('./src/server.js');
}

const app = appModule.default || appModule;

if (app && typeof app.listen === 'function') {
  app.listen(port, () => {
    console.log(`Gateway listening on port ${port}`);
  });
} else {
  console.error('Failed to load express app from', distPath || './src/server.js');
  process.exit(1);
}
