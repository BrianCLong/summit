"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateEngine = void 0;
const lodash_1 = __importDefault(require("lodash"));
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'TemplateEngine' });
class TemplateEngine {
    templates = new Map();
    constructor() {
        // Load default templates
        this.templates.set('welcome', 'Welcome to Summit, <%= name %>!');
        this.templates.set('alert', '[<%= priority %>] Alert: <%= message %>');
        this.templates.set('system_update', 'System Update: <%= details %>');
    }
    registerTemplate(id, template) {
        this.templates.set(id, template);
    }
    render(templateId, data) {
        const template = this.templates.get(templateId);
        if (!template) {
            logger.warn({ templateId }, 'Template not found');
            return '';
        }
        try {
            const compiled = lodash_1.default.template(template);
            return compiled(data);
        }
        catch (error) {
            logger.error({ templateId, error }, 'Error rendering template');
            return template; // Return raw template on error? Or empty string?
        }
    }
}
exports.TemplateEngine = TemplateEngine;
