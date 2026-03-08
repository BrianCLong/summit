"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WormStorageService = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const WORM_STORAGE_PATH = path_1.default.resolve(process.cwd(), 'worm_storage');
/**
 * @class WormStorageService
 * @description Provides a simple interface for storing files in a WORM-like storage.
 *
 * This service simulates a Write-Once, Read-Many storage by saving files
 * to a local directory and making them read-only. In a production environment,
 * this would be replaced with a true WORM-compliant storage solution like AWS S3
 * with Object Lock.
 */
class WormStorageService {
    constructor() {
        this.ensureStorageDirectory();
    }
    async ensureStorageDirectory() {
        try {
            await fs_1.promises.mkdir(WORM_STORAGE_PATH, { recursive: true });
        }
        catch (error) {
            console.error('Failed to create WORM storage directory:', error);
        }
    }
    /**
     * Stores a file in the WORM storage.
     * @param filename The name of the file to store.
     * @param data The file content as a Buffer.
     * @returns The path to the stored file.
     */
    async store(filename, data) {
        const filePath = path_1.default.join(WORM_STORAGE_PATH, filename);
        await fs_1.promises.writeFile(filePath, data);
        // Make the file read-only to simulate WORM
        await fs_1.promises.chmod(filePath, 0o444);
        return filePath;
    }
}
exports.WormStorageService = WormStorageService;
