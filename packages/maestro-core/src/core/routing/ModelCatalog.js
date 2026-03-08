"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelCatalog = void 0;
class ModelCatalog {
    models;
    constructor(models) {
        if (!models.length)
            throw new Error("ModelCatalog requires at least one model");
        this.models = models;
    }
    list() {
        return [...this.models];
    }
    byId(id) {
        return this.models.find(m => m.id === id);
    }
}
exports.ModelCatalog = ModelCatalog;
