"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReceiptRouter = createReceiptRouter;
const express_1 = __importDefault(require("express"));
const pino_1 = __importDefault(require("pino"));
const security_js_1 = require("../../middleware/security.js");
function createReceiptRouter(store, rbacManager, logger = (0, pino_1.default)()) {
    const router = express_1.default.Router();
    router.get('/:id', (0, security_js_1.requirePermission)(rbacManager, 'receipts', 'read'), (req, res) => {
        const receipt = store.get(req.params.id);
        if (!receipt) {
            logger.warn({ id: req.params.id }, 'Receipt not found');
            return res.status(404).json({ error: 'not_found' });
        }
        return res.json(receipt);
    });
    router.post('/export', (0, security_js_1.requirePermission)(rbacManager, 'receipts', 'read'), (req, res) => {
        const { id, redactions, reason } = req.body;
        if (!id) {
            return res.status(400).json({ error: 'id_required' });
        }
        const bundle = store.export({ id, redactions, reason });
        if (!bundle) {
            return res.status(404).json({ error: 'not_found' });
        }
        return res.json({
            receipt: bundle.receipt,
            artifacts: Object.keys(bundle.artifacts),
            disclosure: bundle.receipt.disclosure,
        });
    });
    return router;
}
