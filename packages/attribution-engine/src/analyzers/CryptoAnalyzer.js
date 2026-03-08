"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoAnalyzer = void 0;
class CryptoAnalyzer {
    async analyzeAddress(address) {
        return { address, blockchain: 'bitcoin' };
    }
}
exports.CryptoAnalyzer = CryptoAnalyzer;
