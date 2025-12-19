import { pickBuilder } from './selector';
import * as docker from './builders/docker';
import * as cnb from './builders/buildpacks';
import { FlagClient } from '../../libs/flags/node';

const flagClient = new FlagClient({ env: process.env.NODE_ENV ?? 'dev' });
const bazelFlag = flagClient.catalogKey('feature.build.bazel');

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
  if (kind === 'bazel') {
    const enabled = await flagClient.get<boolean>(bazelFlag, false, {
      env: process.env.NODE_ENV ?? 'dev',
      tenant: pkg.tenant,
    });
    if (!enabled) throw new Error('bazel builder disabled by feature flag');
    return run('bazel', ['build', '//...']);
  }
  return run('pnpm', ['turbo', 'run', 'build', '--filter', pkg.path]);
}
function run(cmd: string, args: string[]) {
  return new Promise<void>((res, rej) =>
    require('child_process').execFile(cmd, args, (e) => (e ? rej(e) : res())),
  );
}
