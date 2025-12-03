import { appLogger } from '../src/logging/structuredLogger.js';
import { winstonBridge } from '../src/logging/winstonBridge.js';

export const logger = appLogger;
export const winstonLogger = winstonBridge;
export default appLogger;
