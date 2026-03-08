"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VertexAIAdapter = void 0;
class VertexAIAdapter {
    name = 'google-vertex:responses';
    defaultModel;
    constructor(options = {}) {
        this.defaultModel = options.model ?? 'gemini-1.5-pro';
    }
    format(compiled, options = {}) {
        const model = options.model ?? this.defaultModel;
        return {
            model,
            contents: [
                {
                    role: 'user',
                    parts: [{ text: compiled.rendered }],
                },
            ],
            metadata: {
                template: compiled.name,
                description: compiled.description,
                values: compiled.values,
            },
        };
    }
}
exports.VertexAIAdapter = VertexAIAdapter;
