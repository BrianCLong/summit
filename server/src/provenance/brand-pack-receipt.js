"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitBrandPackReceipt = emitBrandPackReceipt;
const ReceiptService_js_1 = require("../services/ReceiptService.js");
async function emitBrandPackReceipt(input) {
    const receiptService = ReceiptService_js_1.ReceiptService.getInstance();
    return receiptService.generateReceipt({
        action: 'brand-pack.apply',
        actor: { id: input.actorId, tenantId: input.tenantId },
        resource: `brand-pack:${input.packId}`,
        input: {
            tenantId: input.tenantId,
            packId: input.packId,
            appliedAt: input.appliedAt,
        },
    });
}
