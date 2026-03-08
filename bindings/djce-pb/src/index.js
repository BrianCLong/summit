"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessJoin = void 0;
// eslint-disable-next-line @typescript-eslint/no-var-requires -- native binding is compiled at build time
const native = require('../native/index.node');
const assessJoin = (left, right, options) => {
    return native.assessJoin(left, right, options);
};
exports.assessJoin = assessJoin;
