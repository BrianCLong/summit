"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vickrey = vickrey;
const redis_1 = require("redis");
const r = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});
function vickrey(bids) {
    const s = bids.slice().sort((a, b) => b.bid - a.bid);
    if (!s.length)
        return null;
    const win = s[0];
    const price = s[1]?.bid ?? win.bid;
    return { winner: win.id, price };
}
