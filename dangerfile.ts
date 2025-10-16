import { warn, fail, markdown } from 'danger';
if (!danger.github.pr.body || danger.github.pr.body.length < 20)
  fail('PR description too short');
if (!/#[0-9]+/.test(danger.github.pr.body)) warn('Link an issue (e.g., #123)');
if (danger.github.pr.additions + danger.github.pr.deletions > 1500)
  warn('Consider splitting: PR is large');
// Require tests/docs for src changes
