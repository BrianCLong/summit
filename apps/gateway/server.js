/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const fs = require('fs');

const distPath = path.join(__dirname, 'dist', 'server.js');
if (fs.existsSync(distPath)) {
  // eslint-disable-next-line global-require
  require(distPath);
} else {
  // eslint-disable-next-line global-require
  require('./src/server');
}
