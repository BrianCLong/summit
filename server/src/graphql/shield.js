"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shield = exports.not = exports.or = exports.and = exports.rule = exports.allow = void 0;
const evaluateRule = async (rule, parent, args, ctx, info) => {
    if (typeof rule === 'function') {
        return await rule(parent, args, ctx, info);
    }
    return Boolean(rule);
};
exports.allow = true;
const rule = (_options) => {
    return (fn) => fn;
};
exports.rule = rule;
const and = (...rules) => {
    return async (parent, args, ctx, info) => {
        for (const rule of rules) {
            if (!(await evaluateRule(rule, parent, args, ctx, info))) {
                return false;
            }
        }
        return true;
    };
};
exports.and = and;
const or = (...rules) => {
    return async (parent, args, ctx, info) => {
        for (const rule of rules) {
            if (await evaluateRule(rule, parent, args, ctx, info)) {
                return true;
            }
        }
        return false;
    };
};
exports.or = or;
const not = (ruleToInvert) => {
    return async (parent, args, ctx, info) => {
        return !(await evaluateRule(ruleToInvert, parent, args, ctx, info));
    };
};
exports.not = not;
const shield = (rules, options = {}) => ({
    rules,
    options,
});
exports.shield = shield;
