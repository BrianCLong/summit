"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dominates = dominates;
exports.paretoFront = paretoFront;
function dominates(a, b) {
    return (a.okr >= b.okr &&
        a.cost <= b.cost &&
        a.carbon >= b.carbon &&
        (a.okr > b.okr || a.cost < b.cost || a.carbon > b.carbon));
}
function paretoFront(F) {
    return F.map((fa, i) => ({
        i,
        dom: F.filter((fb, j) => i !== j && dominates(fb, fa)).length,
    }))
        .filter((x) => x.dom === 0)
        .map((x) => x.i);
}
