"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformIndex = exports.TransformIndex = void 0;
class TransformIndex {
    transforms = [];
    constructor(initialTransforms = []) {
        this.transforms = initialTransforms;
    }
    addTransforms(transforms) {
        this.transforms = [...this.transforms, ...transforms];
    }
    setTransforms(transforms) {
        this.transforms = transforms;
    }
    search(query) {
        if (!query)
            return this.transforms;
        const lowerQuery = query.toLowerCase();
        return this.transforms.filter((t) => t.name.toLowerCase().includes(lowerQuery) ||
            t.description.toLowerCase().includes(lowerQuery) ||
            t.inputTypes.some((type) => type.toLowerCase().includes(lowerQuery)));
    }
}
exports.TransformIndex = TransformIndex;
exports.transformIndex = new TransformIndex();
