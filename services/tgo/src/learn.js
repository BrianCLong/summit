"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.update = update;
exports.eta = eta;
const alpha = 0.2;
const model = {};
function update(o) {
    const f = feat(o);
    const m = model[o.path] || { w: 1, last: o.secs };
    m.w = (1 - alpha) * m.w + alpha * (o.secs / (1 + f));
    m.last = o.secs;
    model[o.path] = m;
}
function eta(path) {
    const f = feat({
        path,
        secs: 0,
        size: sz(path),
        flake: false,
        hot: isHot(path),
    });
    const m = model[path];
    return Math.max(2, (m ? m.w : 10) * (1 + f));
}
const sz = (p) => Math.min(10, Math.ceil((p.length % 200) / 20));
const isHot = (p) => /server\/src\/(scheduler|steps)/.test(p);
const feat = (o) => 0.1 * (o.size || 1) + (o.hot ? 0.3 : 0) + 0.2 * (o.flake ? 1 : 0);
