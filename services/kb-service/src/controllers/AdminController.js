"use strict";
/**
 * Admin Controller
 * Handles KB administration, tags, audiences, and export/import
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminController = exports.AdminController = void 0;
const zod_1 = require("zod");
const index_js_1 = require("../repositories/index.js");
const index_js_2 = require("../services/index.js");
const index_js_3 = require("../types/index.js");
const PaginationSchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(100),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
class AdminController {
    // =========================================================================
    // Tags
    // =========================================================================
    async listTags(req, res, next) {
        try {
            const { limit, offset } = PaginationSchema.parse(req.query);
            const category = req.query.category;
            const result = await index_js_1.tagRepository.findAll(limit, offset, category);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
    async getTag(req, res, next) {
        try {
            const { id } = req.params;
            const tag = await index_js_1.tagRepository.findById(id);
            if (!tag) {
                res.status(404).json({ error: 'Tag not found' });
                return;
            }
            res.json(tag);
        }
        catch (error) {
            next(error);
        }
    }
    async createTag(req, res, next) {
        try {
            const input = index_js_3.CreateTagInputSchema.parse(req.body);
            const tag = await index_js_1.tagRepository.create(input);
            res.status(201).json(tag);
        }
        catch (error) {
            next(error);
        }
    }
    async updateTag(req, res, next) {
        try {
            const { id } = req.params;
            const input = index_js_3.UpdateTagInputSchema.parse(req.body);
            const tag = await index_js_1.tagRepository.update(id, input);
            if (!tag) {
                res.status(404).json({ error: 'Tag not found' });
                return;
            }
            res.json(tag);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteTag(req, res, next) {
        try {
            const { id } = req.params;
            const deleted = await index_js_1.tagRepository.delete(id);
            if (!deleted) {
                res.status(404).json({ error: 'Tag not found' });
                return;
            }
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // Audiences
    // =========================================================================
    async listAudiences(req, res, next) {
        try {
            const { limit, offset } = PaginationSchema.parse(req.query);
            const result = await index_js_1.audienceRepository.findAll(limit, offset);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
    async getAudience(req, res, next) {
        try {
            const { id } = req.params;
            const audience = await index_js_1.audienceRepository.findById(id);
            if (!audience) {
                res.status(404).json({ error: 'Audience not found' });
                return;
            }
            res.json(audience);
        }
        catch (error) {
            next(error);
        }
    }
    async createAudience(req, res, next) {
        try {
            const input = index_js_3.CreateAudienceInputSchema.parse(req.body);
            const audience = await index_js_1.audienceRepository.create(input);
            res.status(201).json(audience);
        }
        catch (error) {
            next(error);
        }
    }
    async updateAudience(req, res, next) {
        try {
            const { id } = req.params;
            const input = index_js_3.UpdateAudienceInputSchema.parse(req.body);
            const audience = await index_js_1.audienceRepository.update(id, input);
            if (!audience) {
                res.status(404).json({ error: 'Audience not found' });
                return;
            }
            res.json(audience);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteAudience(req, res, next) {
        try {
            const { id } = req.params;
            const deleted = await index_js_1.audienceRepository.delete(id);
            if (!deleted) {
                res.status(404).json({ error: 'Audience not found' });
                return;
            }
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // Help Anchors
    // =========================================================================
    async listHelpAnchors(req, res, next) {
        try {
            const { limit, offset } = PaginationSchema.parse(req.query);
            const result = await index_js_1.helpAnchorRepository.findAll(limit, offset);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
    async getHelpAnchor(req, res, next) {
        try {
            const { id } = req.params;
            const anchor = await index_js_1.helpAnchorRepository.findById(id);
            if (!anchor) {
                res.status(404).json({ error: 'Help anchor not found' });
                return;
            }
            res.json(anchor);
        }
        catch (error) {
            next(error);
        }
    }
    async createHelpAnchor(req, res, next) {
        try {
            const input = index_js_3.CreateHelpAnchorInputSchema.parse(req.body);
            const anchor = await index_js_1.helpAnchorRepository.create(input);
            res.status(201).json(anchor);
        }
        catch (error) {
            next(error);
        }
    }
    async updateHelpAnchor(req, res, next) {
        try {
            const { id } = req.params;
            const input = index_js_3.UpdateHelpAnchorInputSchema.parse(req.body);
            const anchor = await index_js_1.helpAnchorRepository.update(id, input);
            if (!anchor) {
                res.status(404).json({ error: 'Help anchor not found' });
                return;
            }
            res.json(anchor);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteHelpAnchor(req, res, next) {
        try {
            const { id } = req.params;
            const deleted = await index_js_1.helpAnchorRepository.delete(id);
            if (!deleted) {
                res.status(404).json({ error: 'Help anchor not found' });
                return;
            }
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // Export/Import
    // =========================================================================
    async exportAll(req, res, next) {
        try {
            const data = await index_js_2.exportImportService.exportAll();
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="kb-export-${new Date().toISOString().split('T')[0]}.json"`);
            res.json(data);
        }
        catch (error) {
            next(error);
        }
    }
    async exportArticle(req, res, next) {
        try {
            const { id } = req.params;
            const data = await index_js_2.exportImportService.exportArticle(id);
            if (!data) {
                res.status(404).json({ error: 'Article not found' });
                return;
            }
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="kb-article-${id}.json"`);
            res.json(data);
        }
        catch (error) {
            next(error);
        }
    }
    async importData(req, res, next) {
        try {
            const importerId = req.headers['x-user-id'];
            if (!importerId) {
                res.status(401).json({ error: 'User ID required' });
                return;
            }
            const data = req.body;
            if (!index_js_2.exportImportService.validateExportData(data)) {
                res.status(400).json({ error: 'Invalid export data format' });
                return;
            }
            const overwriteExisting = req.query.overwrite === 'true';
            const preserveIds = req.query.preserveIds === 'true';
            const result = await index_js_2.exportImportService.importData(data, {
                overwriteExisting,
                preserveIds,
                importerId,
            });
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AdminController = AdminController;
exports.adminController = new AdminController();
