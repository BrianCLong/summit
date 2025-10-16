import fs from 'fs';
export function includeComponent(pathOrRef: string) {
  const j = JSON.parse(fs.readFileSync(pathOrRef, 'utf8'));
  return j.jobs; // caller merges into GH/Tekton/Argo
}
