"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPromptTemplate = loadPromptTemplate;
exports.fillTemplate = fillTemplate;
const crypto_1 = require("crypto");
const promises_1 = require("fs/promises");
async function loadPromptTemplate(filePath, id, version) {
    const content = await (0, promises_1.readFile)(filePath, 'utf8');
    const sha256 = (0, crypto_1.createHash)('sha256').update(content).digest('hex');
    return { id, version, content, sha256 };
}
function fillTemplate(template, variables) {
    return Object.entries(variables).reduce((acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value), template);
}
