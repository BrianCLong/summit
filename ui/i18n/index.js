"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translations = void 0;
exports.t = t;
const en_US_1 = require("./en-US");
const locale = en_US_1.enUS;
function interpolate(template, values) {
    if (!values)
        return template;
    return Object.keys(values).reduce((result, key) => {
        const value = values[key];
        return result.replaceAll(`{{${key}}}`, String(value));
    }, template);
}
function t(key, values) {
    const phrase = locale[key];
    if (!phrase) {
        return key;
    }
    return interpolate(phrase, values);
}
exports.translations = { 'en-US': locale };
