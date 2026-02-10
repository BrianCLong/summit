import { buildApp } from './app.js';

const start = async () => {
  const app = await buildApp();
  app.log.level = 'info';

  try {
    await app.listen({ port: 8080, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
