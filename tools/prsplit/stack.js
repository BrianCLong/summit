const fs = require('fs'),
  { execSync } = require('child_process'),
  { Octokit } = require('@octokit/rest');
const gh = new Octokit({ auth: process.env.GH_TOKEN });
const [o, r] = process.env.GITHUB_REPOSITORY.split('/');
const areas = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
(async () => {
  const base = process.env.BASE || 'main';
  const head = exec('git rev-parse --abbrev-ref HEAD');
  let prev = base;
  const links = [];
  for (const [area, files] of Object.entries(areas)) {
    const br = `stack/${area}`;
    exec(`git checkout -b ${br} origin/${base} && git checkout ${head}`);
    exec(
      `git reset --soft origin/${base} && git add ${files.join(' ')} && git commit -m "stack(${area}): slice"`,
    );
    exec(`git push -u origin ${br} -f`);
    const pr = await gh.pulls.create({
      owner: o,
      repo: r,
      head: br,
      base: prev,
      title: `Stack: ${area}`,
      body: `Slice from #${process.env.PR_NUMBER || ''}`,
    });
    links.push(`#${pr.data.number}`);
    prev = br; // chain
  }
  await gh.issues.createComment({
    owner: o,
    repo: r,
    issue_number: process.env.PR_NUMBER,
    body: `Stack created: ${links.join(' → ')}`,
  });
})();
function exec(s) {
  return execSync(s, { stdio: 'pipe' }).toString().trim();
}
