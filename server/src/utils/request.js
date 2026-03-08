"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueryParam = void 0;
const getQueryParam = (param) => Array.isArray(param) ? param[0] : param || '';
exports.getQueryParam = getQueryParam;
