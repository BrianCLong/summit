import { RiskEngine } from '../risk/RiskEngine';
describe('RiskEngine', () => {
    it('scores features with bands', () => {
        const engine = new RiskEngine({ a: 1 }, 0);
        const res = engine.score({ a: 1 }, '7d');
        expect(res.band).toBeDefined();
        expect(res.contributions[0].delta).toBe(1);
    });
});
//# sourceMappingURL=risk_engine.test.js.map