"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptSignerService = void 0;
const provenance_1 = require("@intelgraph/provenance");
const pino_1 = __importDefault(require("pino"));
class ReceiptSignerService {
    options;
    logger;
    constructor(options) {
        this.options = options;
        this.logger = options.logger ?? (0, pino_1.default)({ name: 'receipt-signer' });
    }
    async sign(receipt) {
        this.logger.debug({ receiptId: receipt.id }, 'Signing receipt');
        const payload = (0, provenance_1.canonicalReceiptPayload)({ ...receipt, signature: '' });
        const response = await this.options.kmsClient.sign({ payload });
        const signed = {
            ...receipt,
            signer: {
                ...receipt.signer,
                algorithm: 'ed25519',
                keyId: response.keyId,
            },
            signature: response.signature.toString('base64'),
        };
        this.logger.info({ receiptId: receipt.id, keyId: response.keyId }, 'Receipt signed');
        return signed;
    }
}
exports.ReceiptSignerService = ReceiptSignerService;
