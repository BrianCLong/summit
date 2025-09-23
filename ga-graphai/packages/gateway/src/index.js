import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

export { createApp } from './app.js';

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] === modulePath) {
  const port = Number(process.env.PORT ?? 4000);
  const { app } = createApp();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Universal AI Fabric gateway listening on ${port}`);
  });
}
