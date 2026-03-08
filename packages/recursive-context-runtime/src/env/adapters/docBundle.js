"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocBundleAdapter = void 0;
class DocBundleAdapter {
    async listFiles(prefix) {
        return [];
    }
    async readFile(path, start, end) {
        throw new Error("Not implemented");
    }
    async searchText(pattern, opts) {
        return [];
    }
    async peek(start, len) {
        throw new Error("Not implemented");
    }
    async chunk(strategy, opts) {
        return [];
    }
}
exports.DocBundleAdapter = DocBundleAdapter;
