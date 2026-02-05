export * from './runid.js';
export * from './event.js';

import { generateRunId } from './runid.js';

if (process.argv[2] === 'generate-id') {
  console.log(generateRunId());
}
