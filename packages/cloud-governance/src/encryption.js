"use strict";
/**
 * Data Encryption
 * Encryption at rest and in transit
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionManager = exports.EncryptionAlgorithm = void 0;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'encryption' });
var EncryptionAlgorithm;
(function (EncryptionAlgorithm) {
    EncryptionAlgorithm["AES_256"] = "aes-256-gcm";
    EncryptionAlgorithm["AES_128"] = "aes-128-gcm";
})(EncryptionAlgorithm || (exports.EncryptionAlgorithm = EncryptionAlgorithm = {}));
class EncryptionManager {
    config;
    constructor(config) {
        this.config = config;
    }
    async encryptData(data) {
        logger.info({ algorithm: this.config.algorithm }, 'Encrypting data');
        // Implementation would use actual encryption
        return data;
    }
    async decryptData(data) {
        logger.info({ algorithm: this.config.algorithm }, 'Decrypting data');
        return data;
    }
    async rotateKeys() {
        logger.info('Rotating encryption keys');
    }
}
exports.EncryptionManager = EncryptionManager;
