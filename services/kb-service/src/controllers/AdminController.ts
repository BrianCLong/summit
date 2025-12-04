/**
 * Admin Controller
 * Handles KB administration, tags, audiences, and export/import
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  tagRepository,
  audienceRepository,
  helpAnchorRepository,
} from '../repositories/index.js';
import { exportImportService } from '../services/index.js';
import {
  CreateTagInputSchema,
  UpdateTagInputSchema,
  CreateAudienceInputSchema,
  UpdateAudienceInputSchema,
  CreateHelpAnchorInputSchema,
  UpdateHelpAnchorInputSchema,
} from '../types/index.js';

const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export class AdminController {
  // =========================================================================
  // Tags
  // =========================================================================

  async listTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit, offset } = PaginationSchema.parse(req.query);
      const category = req.query.category as string | undefined;

      const result = await tagRepository.findAll(limit, offset, category);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getTag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const tag = await tagRepository.findById(id);

      if (!tag) {
        res.status(404).json({ error: 'Tag not found' });
        return;
      }

      res.json(tag);
    } catch (error) {
      next(error);
    }
  }

  async createTag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateTagInputSchema.parse(req.body);
      const tag = await tagRepository.create(input);
      res.status(201).json(tag);
    } catch (error) {
      next(error);
    }
  }

  async updateTag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input = UpdateTagInputSchema.parse(req.body);
      const tag = await tagRepository.update(id, input);

      if (!tag) {
        res.status(404).json({ error: 'Tag not found' });
        return;
      }

      res.json(tag);
    } catch (error) {
      next(error);
    }
  }

  async deleteTag(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await tagRepository.delete(id);

      if (!deleted) {
        res.status(404).json({ error: 'Tag not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // Audiences
  // =========================================================================

  async listAudiences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit, offset } = PaginationSchema.parse(req.query);
      const result = await audienceRepository.findAll(limit, offset);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAudience(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const audience = await audienceRepository.findById(id);

      if (!audience) {
        res.status(404).json({ error: 'Audience not found' });
        return;
      }

      res.json(audience);
    } catch (error) {
      next(error);
    }
  }

  async createAudience(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateAudienceInputSchema.parse(req.body);
      const audience = await audienceRepository.create(input);
      res.status(201).json(audience);
    } catch (error) {
      next(error);
    }
  }

  async updateAudience(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input = UpdateAudienceInputSchema.parse(req.body);
      const audience = await audienceRepository.update(id, input);

      if (!audience) {
        res.status(404).json({ error: 'Audience not found' });
        return;
      }

      res.json(audience);
    } catch (error) {
      next(error);
    }
  }

  async deleteAudience(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await audienceRepository.delete(id);

      if (!deleted) {
        res.status(404).json({ error: 'Audience not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // Help Anchors
  // =========================================================================

  async listHelpAnchors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit, offset } = PaginationSchema.parse(req.query);
      const result = await helpAnchorRepository.findAll(limit, offset);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getHelpAnchor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const anchor = await helpAnchorRepository.findById(id);

      if (!anchor) {
        res.status(404).json({ error: 'Help anchor not found' });
        return;
      }

      res.json(anchor);
    } catch (error) {
      next(error);
    }
  }

  async createHelpAnchor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = CreateHelpAnchorInputSchema.parse(req.body);
      const anchor = await helpAnchorRepository.create(input);
      res.status(201).json(anchor);
    } catch (error) {
      next(error);
    }
  }

  async updateHelpAnchor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const input = UpdateHelpAnchorInputSchema.parse(req.body);
      const anchor = await helpAnchorRepository.update(id, input);

      if (!anchor) {
        res.status(404).json({ error: 'Help anchor not found' });
        return;
      }

      res.json(anchor);
    } catch (error) {
      next(error);
    }
  }

  async deleteHelpAnchor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await helpAnchorRepository.delete(id);

      if (!deleted) {
        res.status(404).json({ error: 'Help anchor not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // Export/Import
  // =========================================================================

  async exportAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await exportImportService.exportAll();

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="kb-export-${new Date().toISOString().split('T')[0]}.json"`
      );

      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async exportArticle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data = await exportImportService.exportArticle(id);

      if (!data) {
        res.status(404).json({ error: 'Article not found' });
        return;
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="kb-article-${id}.json"`
      );

      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  async importData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const importerId = req.headers['x-user-id'] as string;

      if (!importerId) {
        res.status(401).json({ error: 'User ID required' });
        return;
      }

      const data = req.body;

      if (!exportImportService.validateExportData(data)) {
        res.status(400).json({ error: 'Invalid export data format' });
        return;
      }

      const overwriteExisting = req.query.overwrite === 'true';
      const preserveIds = req.query.preserveIds === 'true';

      const result = await exportImportService.importData(data, {
        overwriteExisting,
        preserveIds,
        importerId,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
