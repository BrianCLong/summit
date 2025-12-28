import fs from 'fs/promises';
import path from 'path';
import { logger } from '../config/logger.js';

const DATA_FILE = process.env.KILL_SWITCH_FILE || path.resolve(process.cwd(), 'opa/data/kill-switches.json');

export class KillSwitchService {
  private static instance: KillSwitchService;

  private constructor() {
    // Ensure directory exists on startup
    const dir = path.dirname(DATA_FILE);
    fs.mkdir(dir, { recursive: true }).catch(err => logger.error({ err }, 'Failed to create kill switch dir'));
  }

  public static getInstance(): KillSwitchService {
    if (!KillSwitchService.instance) {
      KillSwitchService.instance = new KillSwitchService();
    }
    return KillSwitchService.instance;
  }

  private async readData(): Promise<Record<string, boolean>> {
    try {
      const content = await fs.readFile(DATA_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
          // If missing, return empty (all active=false)
          // This is safe for initial state.
          return {};
      }
      // CRITICAL: Any other error (permissions, corruption) must throw
      // to allow the caller (middleware) to Fail Closed.
      logger.error({ error, path: DATA_FILE }, 'Failed to read kill switch data - potential corruption or permission issue');
      throw error;
    }
  }

  private async writeData(data: Record<string, boolean>): Promise<void> {
    try {
      await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      logger.error({ error }, 'Failed to write kill switch data');
      throw error;
    }
  }

  public async activate(module: string): Promise<void> {
    // We catch read errors here to allow "resetting" a corrupted file via activate if needed?
    // No, if it's corrupted, we probably want to know.
    // But for "emergency off", we might want to force overwrite.
    // Let's try to read, if it fails, we assume empty and overwrite to fix corruption.
    let data: Record<string, boolean> = {};
    try {
        data = await this.readData();
    } catch (e) {
        logger.warn('Reading kill switch data failed, starting with empty state to force activation');
    }

    data[module] = true;
    await this.writeData(data);
    logger.warn({ module, action: 'ACTIVATE' }, 'Kill switch activated');
  }

  public async deactivate(module: string): Promise<void> {
    let data: Record<string, boolean> = {};
    try {
        data = await this.readData();
    } catch (e) {
        logger.warn('Reading kill switch data failed during deactivate, resetting state');
    }
    data[module] = false;
    await this.writeData(data);
    logger.info({ module, action: 'DEACTIVATE' }, 'Kill switch deactivated');
  }

  public async isActive(module: string): Promise<boolean> {
    const data = await this.readData();
    return !!data[module];
  }
}
