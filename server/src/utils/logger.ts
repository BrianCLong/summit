import { logger as configLogger } from '../config/logger.js';

export const logger = configLogger;
export type Logger = typeof configLogger;
export default configLogger;
