import { queue } from '../src/worker.js';

(async () => {
  await queue.drain(true);
  console.log('queue drained');
  process.exit(0);
})();
