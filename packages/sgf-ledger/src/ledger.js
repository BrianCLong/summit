"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ledger = void 0;
const merkle_js_1 = require("./merkle.js");
class Ledger {
    events = [];
    append(event) {
        this.events.push(event);
    }
    getRoot() {
        return (0, merkle_js_1.merkleRoot)(this.events);
    }
    getEventCount() {
        return this.events.length;
    }
}
exports.Ledger = Ledger;
