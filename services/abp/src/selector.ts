export function pickBuilder(pkg: { path: string; has: D }) {
  const d = pkg.has;
  if (d.BAZEL) return 'bazel';
  if (d.CNB) return 'buildpacks';
  if (d.DOCKERFILE) return 'docker';
  return 'turbo';
}
type D = { BAZEL: boolean; CNB: boolean; DOCKERFILE: boolean };
