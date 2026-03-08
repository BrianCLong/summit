"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSDOM = void 0;
class JSDOM {
    constructor() {
        return {
            window: {
                document: {
                    createElement: () => ({}),
                },
            },
        };
    }
}
exports.JSDOM = JSDOM;
