"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryReceiptStore = void 0;
class InMemoryReceiptStore {
    receipts = new Map();
    constructor(initial = []) {
        initial.forEach((receipt) => this.receipts.set(receipt.id, receipt));
    }
    async get(id) {
        return this.receipts.get(id);
    }
    async save(receipt) {
        this.receipts.set(receipt.id, receipt);
    }
}
exports.InMemoryReceiptStore = InMemoryReceiptStore;
