"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterfaceBuilder = void 0;
class InterfaceBuilder {
    build(id, blocks) {
        return {
            id,
            version: 1,
            blocks
        };
    }
}
exports.InterfaceBuilder = InterfaceBuilder;
