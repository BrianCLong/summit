"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGetReceiptRouter = void 0;
const express_1 = require("express");
const security_js_1 = require("../../middleware/security.js");
const createGetReceiptRouter = ({ store, verifier, rbacManager, }) => {
    const router = (0, express_1.Router)();
    router.get('/:id', (0, security_js_1.requirePermission)(rbacManager, 'receipts', 'read'), async (req, res) => {
        try {
            const receipt = await store.get(req.params.id);
            if (!receipt) {
                return res.status(404).json({
                    error: 'Receipt not found',
                    id: req.params.id,
                });
            }
            const verified = await verifier.verify(receipt);
            return res.json({ receipt, verified });
        }
        catch (error) {
            return res.status(500).json({
                error: 'Failed to load receipt',
                message: error instanceof Error
                    ? error.message
                    : 'Unknown error occurred',
            });
        }
    });
    return router;
};
exports.createGetReceiptRouter = createGetReceiptRouter;
exports.default = exports.createGetReceiptRouter;
