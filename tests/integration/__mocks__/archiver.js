"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createArchiver;
const events_1 = require("events");
class MockArchive extends events_1.EventEmitter {
    operations = [];
    pipe() {
        return this;
    }
    append(...args) {
        this.operations.push({ type: 'append', args });
        return this;
    }
    file(...args) {
        this.operations.push({ type: 'file', args });
        return this;
    }
    directory(...args) {
        this.operations.push({ type: 'directory', args });
        return this;
    }
    async finalize() {
        setImmediate(() => this.emit('finish'));
    }
}
function createArchiver() {
    return new MockArchive();
}
