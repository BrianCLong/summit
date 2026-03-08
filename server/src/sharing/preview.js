"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planShare = void 0;
const store_js_1 = require("./store.js");
const planShare = (input) => (0, store_js_1.computePlan)(input);
exports.planShare = planShare;
