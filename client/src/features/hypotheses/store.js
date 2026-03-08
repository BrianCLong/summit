"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHypothesisStore = createHypothesisStore;
function createHypothesisStore() {
    const store = {
        hypotheses: [],
        addHypothesis(h) {
            store.hypotheses.push({ ...h, posterior: h.prior });
        },
        addEvidence(id, e) {
            const h = store.hypotheses.find((x) => x.id === id);
            if (!h)
                return;
            h.evidence.push(e);
            const odds = h.posterior / (1 - h.posterior);
            const updated = odds * e.weight;
            h.posterior = updated / (1 + updated);
        },
        addDissent(id, note) {
            const h = store.hypotheses.find((x) => x.id === id);
            if (h)
                h.dissent.push(note);
        },
    };
    return store;
}
