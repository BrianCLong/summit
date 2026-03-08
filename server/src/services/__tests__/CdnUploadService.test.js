"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = require("fs");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const mockSend = globals_1.jest.fn();
(0, globals_1.describe)('CdnUploadService', () => {
    (0, globals_1.beforeEach)(() => {
        mockSend.mockReset();
        mockSend.mockResolvedValue({});
    });
    (0, globals_1.it)('uploads assets and returns CDN URLs', async () => {
        const { CdnUploadService } = await Promise.resolve().then(() => __importStar(require('../CdnUploadService.js')));
        const tmpDir = await fs_1.promises.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'cdn-upload-'));
        const filePath = path_1.default.join(tmpDir, 'file.jpg');
        await fs_1.promises.writeFile(filePath, 'content');
        const service = new CdnUploadService({
            enabled: true,
            bucket: 'test-bucket',
            region: 'us-east-1',
            publicUrl: 'https://cdn.example.com',
            accessKeyId: 'test-access-key',
            secretAccessKey: 'test-secret-key',
        });
        service.client.send = mockSend;
        const result = await service.uploadFiles([
            { localPath: filePath, key: 'file.jpg', contentType: 'image/jpeg' },
        ]);
        (0, globals_1.expect)(mockSend).toHaveBeenCalledTimes(1);
        (0, globals_1.expect)(result['file.jpg']).toBe('https://cdn.example.com/file.jpg');
    });
});
