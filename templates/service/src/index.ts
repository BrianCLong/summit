import { initTelemetry } from './telemetry.js';
// Initialize telemetry before anything else
const SERVICE_NAME = process.env.SERVICE_NAME || 'service-template';
initTelemetry(SERVICE_NAME);

import app from './app.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Service ${SERVICE_NAME} listening on port ${PORT}`);
});
