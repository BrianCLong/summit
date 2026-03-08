"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scaffoldService = scaffoldService;
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const node_fs_1 = require("node:fs");
async function copyTemplate(src, dest, replacements) {
    const entries = await node_fs_1.promises.readdir(src, { withFileTypes: true });
    await node_fs_1.promises.mkdir(dest, { recursive: true });
    for (const entry of entries) {
        const srcPath = node_path_1.default.join(src, entry.name);
        const destPath = node_path_1.default.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyTemplate(srcPath, destPath, replacements);
        }
        else {
            const content = await node_fs_1.promises.readFile(srcPath, 'utf-8');
            const replaced = Object.entries(replacements).reduce((acc, [key, value]) => acc.replaceAll(key, value), content);
            await node_fs_1.promises.writeFile(destPath, replaced, 'utf-8');
        }
    }
}
async function scaffoldService(targetDir, serviceName) {
    const here = node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url));
    const templateDir = node_path_1.default.join(here, '../template');
    await copyTemplate(templateDir, targetDir, {
        __SERVICE_NAME__: serviceName,
        __service_name__: serviceName,
    });
}
