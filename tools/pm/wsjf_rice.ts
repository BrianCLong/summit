import { Octokit } from "@octokit/rest"; const gh = new Octokit({ auth: process.env.GITHUB_TOKEN });
const [owner,repo] = process.env.GITHUB_REPOSITORY!.split("/");
function num(label?:string){ const m = /(\d+(\.\d+)?)/.exec(label||""); return m?Number(m[1]):1; }

async function run(){
  const issues = (await gh.issues.listForRepo({ owner, repo, state:"open", per_page:100 })).data.filter(i=>!i.pull_request);
  const scored = issues.map(i=>{
    const reach = num(i.labels.find((l:any)=>l.name?.startsWith("reach:"))?.name);
    const impact = num(i.labels.find((l:any)=>l.name?.startsWith("impact:"))?.name);
    const conf = num(i.labels.find((l:any)=>l.name?.startsWith("confidence:"))?.name);
    const effort = num(i.labels.find((l:any)=>l.name?.startsWith("effort:"))?.name) || 3;
    const rice = (reach*impact*conf)/Math.max(1,effort);
    const bv = num(i.labels.find((l:any)=>l.name?.startsWith("bv:"))?.name); // business value
    const tc = num(i.labels.find((l:any)=>l.name?.startsWith("tc:"))?.name); // time criticality
    const rr = num(i.labels.find((l:any)=>l.name?.startsWith("rr:"))?.name); // risk reduction
    const wsjf = (bv+tc+rr)/effort;
    return { i, rice, wsjf };
  }).sort((a,b)=> (b.wsjf - a.wsjf) || (b.rice - a.rice));
  // output top 12 as sprint plan
  const top = scored.slice(0,12);
  let body = "### Sprint Autoplan\n\n|#|Issue|WSJF|RICE|\n|--|--|--:|--:|
";
  top.forEach((x,idx)=> body += `|${idx+1}|#${x.i.number} ${x.i.title}|${x.wsjf.toFixed(2)}|${x.rice.toFixed(2)}|\n`);
  await gh.issues.create({ owner, repo, title:
    `Sprint Plan ${new Date().toISOString().slice(0,10)}`,
    body });
}
run().catch(e=>{
  console.error(e);
  process.exit(1);
});
