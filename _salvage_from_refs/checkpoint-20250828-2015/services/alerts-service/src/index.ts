import { createServer } from './server.js';

const port = Number(process.env.ALERTS_PORT || 4301);
createServer().then(app => app.listen(port, () => console.log(`alerts-service on :${port}`)));
