// services/zk-tx-svc/src/proofs.ts
export interface OverlapProof {
  id:string;
  type:"overlap";
  selectorHashA:string;
  selectorHashB:string;
  proof:string;
}

export function makeOverlapProof(a:string,b:string):OverlapProof{
  return {
    id: "pr_"+Date.now(),
    type:"overlap",
    selectorHashA:a,
    selectorHashB:b,
    proof:"zk-stub"
  };
}
