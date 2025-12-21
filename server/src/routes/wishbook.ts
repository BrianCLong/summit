import express, { Request, Response, NextFunction } from 'express';
import { WishbookService } from '../services/WishbookService.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { WishbookStatus } from '../wishbook/types.js';

const router = express.Router();
const wishbookService = WishbookService.getInstance();

// Intake: Create a new wishbook item
router.post(
  '/intake',
  ensureAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const newItem = await wishbookService.intake(req.body, user.id || user.sub || 'unknown');
      res.status(201).json(newItem);
    } catch (error) {
      next(error);
    }
  }
);

// List items
router.get(
  '/',
  ensureAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, createdBy } = req.query;
      const filters = {
        status: status ? (status as WishbookStatus) : undefined,
        createdBy: createdBy ? (createdBy as string) : undefined,
      };
      const items = await wishbookService.list(filters);
      res.json(items);
    } catch (error) {
      next(error);
    }
  }
);

// Canonicalize an item
router.post(
  '/:id/canonicalize',
  ensureAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await wishbookService.canonicalize(req.params.id);
      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

// Update tags
router.patch(
  '/:id/tags',
  ensureAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await wishbookService.updateTags(req.params.id, req.body);
      res.json(item);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
