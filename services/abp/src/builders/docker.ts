import { execFile } from 'child_process';
export async function buildDocker(ctx: {
  image: string;
  tags: string[];
  context: string;
}) {
  await run('docker', [
    'buildx',
    'build',
    '--push',
    '-t',
    ctx.image,
    ...ctx.tags.flatMap((t) => ['-t', t]),
    ctx.context,
  ]);
}
function run(cmd: string, args: string[]) {
  return new Promise<void>((res, rej) =>
    execFile(cmd, args, (e) => (e ? rej(e) : res())),
  );
}
