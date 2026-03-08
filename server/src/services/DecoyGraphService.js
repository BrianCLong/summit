"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecoyGraphService = void 0;
class DecoyGraphService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!DecoyGraphService.instance) {
            DecoyGraphService.instance = new DecoyGraphService();
        }
        return DecoyGraphService.instance;
    }
    generateDecoyCypher(count, seed) {
        const label = 'DecoyEntity';
        const query = `
      UNWIND range(1, ${count}) as i
      CREATE (n:${label} {
        id: 'decoy-' + '${seed}-' + i,
        name: 'Project ' + toString(i) + ' (CLASSIFIED)',
        _decoy: true,
        createdAt: datetime()
      })
      RETURN count(n) as createdCount
    `;
        return query;
    }
    checkDecoyAccess(node) {
        if (node && node.properties && node.properties._decoy === true) {
            this.triggerAlert(node.properties.id);
            return true;
        }
        return false;
    }
    triggerAlert(nodeId) {
        console.error(`[SECURITY ALERT] Decoy Node Accessed: ${nodeId}`);
    }
}
exports.DecoyGraphService = DecoyGraphService;
