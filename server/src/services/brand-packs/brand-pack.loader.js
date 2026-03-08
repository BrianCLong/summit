"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadBrandPack = loadBrandPack;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const brand_pack_schema_js_1 = require("./brand-pack.schema.js");
const PACKS_DIR = path_1.default.resolve(process.cwd(), 'server', 'src', 'services', 'brand-packs', 'packs');
const normalizePackId = (packId) => packId.endsWith('.json') ? packId : `${packId}.json`;
async function loadBrandPack(packId) {
    const fileName = normalizePackId(packId);
    const filePath = path_1.default.join(PACKS_DIR, fileName);
    const contents = await fs_1.promises.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(contents);
    return brand_pack_schema_js_1.BrandPackSchema.parse(parsed);
}
