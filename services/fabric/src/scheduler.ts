import { execFile } from "child_process";
type Quote = { provider:"aws"|"gcp"|"azure"; region:string; spotUsdHour:number; latencyMs:number };
export async function pickPool(quotes:Quote[], needGpu=false){
  // price+latency score
  const ranked = quotes.map(q => ({ q, s: q.spotUsdHour*0.7 + (q.latencyMs/1000)*0.3 })).sort((a,b)=>a.s-b.s);
  return ranked[0].q;
}
export async function spawnRunner(pool:Quote, label:string){
  // Assume prebuilt images & cloud CLIs available; replace with Terraform if desired
  const name = `maestro-${label}-${Date.now()}`;
  if (pool.provider==="aws") await run("aws",["ec2","run-instances","--instance-type","c7g.large","--instance-market-options","MarketType=spot","--tag-specifications",`ResourceType=instance,Tags=[{Key=Name,Value=${name}}]`]);
  if (pool.provider==="gcp") await run("gcloud",["compute","instances","create-with-container",name,"--machine-type=e2-standard-4","--preemptible"]);
  // register as GH runner via ephemeral token (omitted for brevity)
}
function run(cmd:string,args:string[]){ return new Promise<void>((res,rej)=>execFile(cmd,args,(e,o,er)=>e?rej(er||e):res())); }