"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRegistry = void 0;
class TemplateRegistry {
    templates = new Map();
    register(template) {
        this.templates.set(template.id, template);
    }
    get(id) {
        return this.templates.get(id);
    }
    list() {
        return Array.from(this.templates.values());
    }
}
exports.TemplateRegistry = TemplateRegistry;
