import { Router } from 'express';
import { requireInternalAccess } from '../../middleware/internal-access.js';
import { CommandConsoleService } from '../../services/CommandConsoleService.js';

const router = Router();
const service = new CommandConsoleService();

router.use(requireInternalAccess);

router.get('/summary', async (_req, res) => {
  try {
    const snapshot = await service.getSnapshot();
    res.json(snapshot);
  } catch (error: any) {
    res.status(500).json({
      error: 'failed_to_load_command_console',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/incidents', async (_req, res) => {
  try {
    const snapshot = await service.getSnapshot();
    res.json(snapshot.incidents);
  } catch (error: any) {
    res.status(500).json({
      error: 'failed_to_load_incidents',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/tenants', async (_req, res) => {
  try {
    const snapshot = await service.getSnapshot();
    res.json({
      tenants: snapshot.tenants,
      generatedAt: snapshot.generatedAt,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'failed_to_load_tenants',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
