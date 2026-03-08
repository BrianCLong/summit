"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pack = pack;
function pack(jobs, cap) {
    const q = jobs.slice().sort((a, b) => b.vram - a.vram);
    const bins = [];
    const alloc = {};
    for (const j of q) {
        let i = bins.findIndex((x) => x + j.vram <= cap);
        if (i < 0) {
            i = bins.push(0) - 1;
        }
        bins[i] += j.vram;
        alloc[j.id] = i;
    }
    return alloc;
}
