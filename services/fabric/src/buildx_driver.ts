import { execFileSync } from 'child_process';
export function bake(to: string, context: string, addr: string) {
  execFileSync(
    'docker',
    [
      'buildx',
      'create',
      '--driver',
      'remote',
      '--name',
      'bk',
      '--endpoint',
      addr,
    ],
    { stdio: 'inherit' },
  );
  execFileSync('docker', ['buildx', 'use', 'bk'], { stdio: 'inherit' });
  execFileSync('docker', ['buildx', 'build', '--push', '-t', to, context], {
    stdio: 'inherit',
  });
}
