export class CostModel {
    constructor(rates) {
        this.rates = rates;
    }
    cost(usage) {
        return usage.apiCalls * this.rates.api + usage.computeSeconds * this.rates.compute;
    }
}
//# sourceMappingURL=CostModel.js.map