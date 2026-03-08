"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evalRule = evalRule;
const jexl_1 = __importDefault(require("jexl"));
const json_logic_js_1 = __importDefault(require("json-logic-js"));
const rest_1 = require("@octokit/rest");
const gh = new rest_1.Octokit({ auth: process.env.GITHUB_TOKEN });
async function evalRule(ev, rule) {
    if (!json_logic_js_1.default.apply(rule.when, ev))
        return false;
    if (rule.if && !(await jexl_1.default.eval(rule.if, ev)))
        return false;
    for (const action of rule.then) {
        if (action.do === 'label')
            await gh.issues.addLabels({
                owner: o(),
                repo: r(),
                issue_number: ev.payload.number,
                labels: action.with.labels,
            });
        if (action.do === 'comment')
            await gh.issues.createComment({
                owner: o(),
                repo: r(),
                issue_number: ev.payload.number,
                body: action.with.body,
            });
        if (action.do === 'require-owners')
            await gh.issues.addLabels({
                owner: o(),
                repo: r(),
                issue_number: ev.payload.number,
                labels: ['owners:required'],
            });
        // extend: trigger rebuild, call webhook, open ticket, etc.
    }
    return true;
}
function o() {
    return process.env.GH_OWNER;
}
function r() {
    return process.env.GH_REPO;
}
