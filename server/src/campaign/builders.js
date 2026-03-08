"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCampaignTemplate = loadCampaignTemplate;
exports.validateCampaign = validateCampaign;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
async function loadCampaignTemplate(templateName) {
    // Validate templateName to prevent Path Traversal
    if (!/^[a-zA-Z0-9_-]+$/.test(templateName)) {
        throw new Error(`Invalid template name: ${templateName}`);
    }
    const filePath = path_1.default.join(__dirname, 'templates', `${templateName}.json`);
    try {
        const data = await promises_1.default.readFile(filePath, 'utf-8');
        const campaign = JSON.parse(data);
        return campaign;
    }
    catch (error) {
        throw new Error(`Failed to load template ${templateName}: ${error}`);
    }
}
function validateCampaign(campaign) {
    if (!campaign.id || !campaign.name)
        return false;
    if (!Array.isArray(campaign.actors))
        return false;
    if (!Array.isArray(campaign.assets))
        return false;
    if (!Array.isArray(campaign.narratives))
        return false;
    if (!Array.isArray(campaign.evidence))
        return false;
    if (!Array.isArray(campaign.actions))
        return false;
    return true;
}
