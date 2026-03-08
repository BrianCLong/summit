"use strict";
/**
 * Cryptographic Inventory
 * Tracks all cryptographic usage across the system
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CryptoInventoryImpl = void 0;
exports.createCryptoInventory = createCryptoInventory;
const types_1 = require("../types");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class CryptoInventoryImpl {
    items = new Map();
    async scan(paths) {
        const discovered = [];
        for (const scanPath of paths) {
            const items = await this.scanPath(scanPath);
            discovered.push(...items);
        }
        // Add discovered items to inventory
        for (const item of discovered) {
            this.items.set(item.location, item);
        }
        return discovered;
    }
    add(item) {
        this.items.set(item.location, { ...item });
    }
    update(location, updates) {
        const item = this.items.get(location);
        if (!item) {
            throw new Error(`Inventory item at ${location} not found`);
        }
        Object.assign(item, updates);
        item.lastUpdated = new Date();
    }
    getAll() {
        return Array.from(this.items.values());
    }
    getByStatus(status) {
        return this.getAll().filter(item => item.migrationStatus === status);
    }
    getHighPriority() {
        return this.getAll().filter(item => item.criticality === 'high' ||
            item.criticality === 'critical' ||
            item.dataClassification === 'secret' ||
            item.dataClassification === 'top-secret');
    }
    async scanPath(scanPath) {
        const items = [];
        try {
            const stats = await fs.stat(scanPath);
            if (stats.isFile()) {
                const fileItems = await this.scanFile(scanPath);
                items.push(...fileItems);
            }
            else if (stats.isDirectory()) {
                const entries = await fs.readdir(scanPath);
                for (const entry of entries) {
                    const fullPath = path.join(scanPath, entry);
                    const subItems = await this.scanPath(fullPath);
                    items.push(...subItems);
                }
            }
        }
        catch (error) {
            console.error(`Error scanning ${scanPath}:`, error);
        }
        return items;
    }
    async scanFile(filePath) {
        const items = [];
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            // Scan for cryptographic patterns
            items.push(...this.detectRSA(filePath, content));
            items.push(...this.detectECDSA(filePath, content));
            items.push(...this.detectAES(filePath, content));
            items.push(...this.detectPQC(filePath, content));
        }
        catch (error) {
            // Skip files that can't be read as text
        }
        return items;
    }
    detectRSA(filePath, content) {
        const patterns = [
            /RSA/i,
            /PKCS1/i,
            /generateKeyPair.*rsa/i,
            /createSign.*RSA/i,
        ];
        if (patterns.some(pattern => pattern.test(content))) {
            return [{
                    location: filePath,
                    operation: types_1.CryptoOperation.DIGITAL_SIGNATURE,
                    algorithm: 'RSA',
                    version: '1.0',
                    lastUpdated: new Date(),
                    criticality: 'high',
                    dataClassification: 'confidential',
                    migrationStatus: 'pending',
                }];
        }
        return [];
    }
    detectECDSA(filePath, content) {
        const patterns = [
            /ECDSA/i,
            /secp256/i,
            /P-256/i,
            /elliptic.*curve/i,
        ];
        if (patterns.some(pattern => pattern.test(content))) {
            return [{
                    location: filePath,
                    operation: types_1.CryptoOperation.DIGITAL_SIGNATURE,
                    algorithm: 'ECDSA',
                    version: '1.0',
                    lastUpdated: new Date(),
                    criticality: 'high',
                    dataClassification: 'confidential',
                    migrationStatus: 'pending',
                }];
        }
        return [];
    }
    detectAES(filePath, content) {
        const patterns = [
            /AES/i,
            /aes-256-gcm/i,
            /createCipheriv.*aes/i,
        ];
        if (patterns.some(pattern => pattern.test(content))) {
            return [{
                    location: filePath,
                    operation: types_1.CryptoOperation.ENCRYPTION,
                    algorithm: 'AES-256-GCM',
                    version: '1.0',
                    lastUpdated: new Date(),
                    criticality: 'medium',
                    dataClassification: 'confidential',
                    migrationStatus: 'not-applicable', // AES is quantum-resistant for symmetric encryption
                }];
        }
        return [];
    }
    detectPQC(filePath, content) {
        const items = [];
        // Kyber
        if (/kyber/i.test(content)) {
            items.push({
                location: filePath,
                operation: types_1.CryptoOperation.KEY_ENCAPSULATION,
                algorithm: 'Kyber',
                version: '3.0',
                lastUpdated: new Date(),
                criticality: 'low',
                dataClassification: 'internal',
                migrationStatus: 'completed',
            });
        }
        // Dilithium
        if (/dilithium/i.test(content)) {
            items.push({
                location: filePath,
                operation: types_1.CryptoOperation.DIGITAL_SIGNATURE,
                algorithm: 'Dilithium',
                version: '3.1',
                lastUpdated: new Date(),
                criticality: 'low',
                dataClassification: 'internal',
                migrationStatus: 'completed',
            });
        }
        return items;
    }
    exportReport() {
        const items = this.getAll();
        const summary = {
            total: items.length,
            byStatus: this.groupBy(items, 'migrationStatus'),
            byCriticality: this.groupBy(items, 'criticality'),
            byAlgorithm: this.groupBy(items, 'algorithm'),
            quantumVulnerable: items.filter(item => item.algorithm === 'RSA' ||
                item.algorithm === 'ECDSA' ||
                item.algorithm === 'DH').length,
        };
        return JSON.stringify(summary, null, 2);
    }
    groupBy(items, key) {
        return items.reduce((acc, item) => {
            const value = String(item[key]);
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {});
    }
}
exports.CryptoInventoryImpl = CryptoInventoryImpl;
function createCryptoInventory() {
    return new CryptoInventoryImpl();
}
