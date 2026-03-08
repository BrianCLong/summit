"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPAnalyzer = void 0;
class IPAnalyzer {
    async analyzeIP(ip) {
        return { ip, valid: true };
    }
}
exports.IPAnalyzer = IPAnalyzer;
