"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptsClient = void 0;
const receipt_v0_1_json_1 = __importDefault(require("../../../prov-ledger/schema/receipt.v0.1.json"));
const _receiptSchema = receipt_v0_1_json_1.default;
class ReceiptsClient {
    client;
    basePath = '/api/provenance/receipts';
    constructor(client) {
        this.client = client;
    }
    /**
     * Submit a signed provenance receipt to the platform.
     */
    async submitReceipt(receipt) {
        const response = await this.client.post(this.basePath, receipt);
        return response.data;
    }
    /**
     * Retrieve the latest status for a previously submitted receipt.
     *
     * TODO: Update the endpoint path if a dedicated receipt status route is introduced.
     */
    async getReceiptStatus(receiptId) {
        const response = await this.client.get(`${this.basePath}/${receiptId}`);
        return response.data;
    }
}
exports.ReceiptsClient = ReceiptsClient;
