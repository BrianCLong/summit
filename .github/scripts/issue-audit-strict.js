const run = require('./issue-triage-strict');

module.exports = async function audit({ github, context }) {
  await run({ github, context });
};
