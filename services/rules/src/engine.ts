import jexl from 'jexl';
import jsonlogic from 'json-logic-js';
import { Octokit } from '@octokit/rest';
const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });
type Event = { kind: string; payload: any };
type Rule = {
  id: string;
  when: any;
  if?: string;
  then: Array<{ do: string; with?: any }>;
};

export async function evalRule(ev: Event, rule: Rule) {
  if (!jsonlogic.apply(rule.when, ev)) return false;
  if (rule.if && !(await jexl.eval(rule.if, ev))) return false;
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
  return process.env.GH_OWNER!;
}
function r() {
  return process.env.GH_REPO!;
}
