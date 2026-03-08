"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationshipService = void 0;
class RelationshipService {
    driver = null;
    setDriver(driver) {
        this.driver = driver;
    }
    suggestRelationshipTypes(_sourceType, _targetType) {
        // Default heuristic: rely on upstream services to inject smarter logic.
        return [];
    }
}
exports.RelationshipService = RelationshipService;
