import { flagService } from '../services/FlagService.js';
import logger from '../utils/logger.js';

export const setFlagHandler = async (req: any, res: any) => {
  try {
    const { name, value, ttlSeconds } = req.body;

    if (!name || value === undefined) {
      return res.status(400).json({ error: 'name and value are required' });
    }

    const userId = req.user?.id || 'unknown';
    const tenantId = req.user?.tenantId || 'system';

    await flagService.setFlag(name, value, userId, tenantId);

    // If TTL is provided, schedule a clear (in-memory only, lost on restart)
    if (ttlSeconds && typeof ttlSeconds === 'number') {
        setTimeout(() => {
            flagService.clearFlag(name, 'system-ttl', tenantId);
        }, ttlSeconds * 1000);
    }

    res.json({ success: true, name, value, message: 'Flag set successfully' });
  } catch (error: any) {
    logger.error('Error setting flag', error);
    res.status(500).json({ error: 'Failed to set flag' });
  }
};

export const getFlagHandler = async (req: any, res: any) => {
    const val = flagService.getFlag(req.params.name);
    res.json({ name: req.params.name, value: val });
};
