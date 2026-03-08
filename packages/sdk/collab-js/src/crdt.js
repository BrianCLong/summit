"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextCRDT = void 0;
class TextCRDT {
    text;
    constructor(initial = '') {
        this.text = initial;
    }
    apply(op) {
        if (op.insert) {
            const { pos, value } = op.insert;
            this.text = this.text.slice(0, pos) + value + this.text.slice(pos);
        }
        else if (op.delete) {
            const { pos, count } = op.delete;
            this.text = this.text.slice(0, pos) + this.text.slice(pos + count);
        }
    }
    value() {
        return this.text;
    }
    merge(other) {
        return new TextCRDT(other.value());
    }
}
exports.TextCRDT = TextCRDT;
