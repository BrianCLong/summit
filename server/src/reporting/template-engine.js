"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultTemplateEngine = exports.TemplateEngine = void 0;
// @ts-nocheck
const nunjucks_1 = __importDefault(require("nunjucks"));
const env = new nunjucks_1.default.Environment(undefined, {
    autoescape: false,
    trimBlocks: true,
    lstripBlocks: true,
});
env.addFilter('as_date', (value) => {
    if (!value)
        return '';
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toISOString();
});
env.addFilter('uppercase', (value) => typeof value === 'string' ? value.toUpperCase() : value);
env.addFilter('truncate', (value, length) => {
    if (typeof value !== 'string')
        return value;
    if (value.length <= length)
        return value;
    return `${value.substring(0, length)}…`;
});
class TemplateEngine {
    environment;
    constructor(environment = env) {
        this.environment = environment;
    }
    render(template, context) {
        const rendered = this.environment.renderString(template.content, context);
        return { rendered, context };
    }
}
exports.TemplateEngine = TemplateEngine;
exports.defaultTemplateEngine = new TemplateEngine();
