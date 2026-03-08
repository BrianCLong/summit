"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderMarkdown = renderMarkdown;
const dompurify_1 = __importDefault(require("dompurify"));
const marked_1 = require("marked");
marked_1.marked.setOptions({
    gfm: true,
    breaks: true,
});
function renderMarkdown(content) {
    const html = marked_1.marked.parse(content ?? '');
    const rendered = typeof html === 'string' ? html : '';
    return dompurify_1.default.sanitize(rendered, { USE_PROFILES: { html: true } });
}
