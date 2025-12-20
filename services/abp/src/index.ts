import { pickBuilder } from './selector';
import * as docker from './builders/docker';
import * as cnb from './builders/buildpacks';
export async function buildPackage(pkg: any) {
  const kind = pickBuilder(pkg);
  if (kind === 'docker')
    return docker.buildDocker({
      image: pkg.image,
      tags: pkg.tags,
      context: pkg.path,
    });
  if (kind === 'buildpacks')
    return cnb.buildCNB({ image: pkg.image, path: pkg.path });
  if (kind === 'bazel') return run('bazel', ['build', '//...']);
  return run('pnpm', ['turbo', 'run', 'build', '--filter', pkg.path]);
}
function run(cmd: string, args: string[]) {
  return new Promise<void>((res, rej) =>
    require('child_process').execFile(cmd, args, (e) => (e ? rej(e) : res())),
  );
}
