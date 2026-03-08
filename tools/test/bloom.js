"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setBit = setBit;
function setBit(buf, h) {
    buf[h % (buf.length * 8) >> 3] |= 1 << h % 8;
}
