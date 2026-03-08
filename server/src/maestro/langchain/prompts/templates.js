"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRegistry = void 0;
exports.TemplateRegistry = {
    get(id) {
        return {
            id,
            version: 'v1',
            text: 'Hello, {{name}}',
            checksum: 'sha256:deadbeef',
        };
    },
    render(t, vars) {
        return t.text.replace(/\{\{(.*?)\}\}/g, (_, k) => String(vars[k.trim()] ?? ''));
    },
};
