// services/ingest/src/connectors/ofac.ts
export async function loadOFAC(){
  return [{ name:"ACME LTD", country:"IR" }];
}

export function toCanonical(rec:any){
  return {
    entity:"Org",
    name:rec.name,
    labels:["sanctioned"],
    license:["OFAC"],
    retentionDays:3650
  };
}
