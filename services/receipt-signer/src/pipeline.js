"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachReceiptSigning = attachReceiptSigning;
function attachReceiptSigning(pipeline, signer) {
    pipeline.use('post-execution', async (ctx) => {
        ctx.receipt = await signer.sign(ctx.receipt);
    });
}
