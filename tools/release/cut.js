const { execSync } = require("child_process"); const v=execSync("git tag --sort=-v:refname | head -n1").toString().trim();
const next = v.replace(/\d+$/, m => String(Number(m)+1)) || "v1.0.0";
execSync(`git tag ${next} && git push origin ${next}`);