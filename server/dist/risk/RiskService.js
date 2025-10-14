import { FeatureStore } from './FeatureStore';
import { RiskEngine } from './RiskEngine';
import { verifyWeights } from './WeightsVerifier';
import path from 'path';
const modelsDir = path.join(__dirname, '..', '..', 'models');
const weightsPath = path.join(modelsDir, 'weights.json');
const checksums = require(path.join(modelsDir, 'checksums.json'));
export class RiskService {
    constructor() {
        this.store = new FeatureStore();
        const data = verifyWeights(weightsPath, checksums['weights.json']);
        this.engine = new RiskEngine(data.weights, data.bias, data.version || 'v1');
    }
    async compute(entityId, window) {
        const features = await this.store.getFeatures(entityId, window);
        return this.engine.score(features, window);
    }
    async recomputeBatch(entityIds, window) {
        const results = [];
        for (const id of entityIds) {
            results.push(await this.compute(id, window));
        }
        return results;
    }
}
//# sourceMappingURL=RiskService.js.map