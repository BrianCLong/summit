import { Octokit } from "@octokit/rest"; import * as path from "path"; import * as fs from "fs";
const gh = new Octokit({ auth: process.env.GITHUB_TOKEN }); const [o,r] = process.env.GITHUB_REPOSITORY!.split("/");
(async ()=>{
  const num = Number(process.env.EPIC_NUMBER);
  const { data: epic } = await gh.issues.get({ owner:o, repo:r, issue_number:num });
  const changedAreas = (epic.body||"").match(/Areas:(.*)$
/im)?.[1]?.split(",").map(s=>s.trim()) || ["server","client"];
  const owners = JSON.parse(fs.readFileSync(".github/CODEOWNERS_MAP.json","utf8")); // prebuilt map
  for (const area of changedAreas){
    const assignee = owners[area]?.[0];
    await gh.issues.create({ owner:o, repo:r, title:`[Slice] ${epic.title} — ${area}`, body:`From #${num}\n\n- [ ] Design\n- [ ] Code\n- [ ] Tests\n- [ ] Docs`, assignees: assignee?[assignee]:undefined, labels:["slice"] });
  }
})();
