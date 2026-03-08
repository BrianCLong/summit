"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
const stream_1 = require("stream");
describe('createEmitter', () => {
    it('writes newline delimited JSON', () => {
        let data = '';
        const stream = new stream_1.Writable({
            write(chunk, _enc, cb) {
                data += chunk.toString();
                cb();
            },
        });
        const emit = (0, index_1.createEmitter)(stream);
        emit({ foo: 'bar' });
        expect(data).toBe('{"foo":"bar"}\n');
    });
});
