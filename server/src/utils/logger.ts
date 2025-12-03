import { appLogger } from '../logging/structuredLogger.js';
import { winstonBridge } from '../logging/winstonBridge.js';

export const winstonLogger = winstonBridge;
export default appLogger;
