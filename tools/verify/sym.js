"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evalSym = evalSym;
function evalSym(e, env) {
    if (e.kind === 'const')
        return { val: e.val };
    if (e.kind === 'var')
        return { val: env[e.name] };
    const A = evalSym(e.a, env).val, B = evalSym(e.b, env).val;
    switch (e.op) {
        case '+':
            return { val: A + B };
        case '-':
            return { val: A - B };
        case '<=':
            return { val: A <= B ? 1 : 0 };
        default:
            throw e.op;
    }
}
