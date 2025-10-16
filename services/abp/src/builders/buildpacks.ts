export async function buildCNB({
  image,
  path,
}: {
  image: string;
  path: string;
}) {
  await run('pack', [
    'build',
    image,
    '--builder',
    'paketobuildpacks/builder-jammy-base',
    '--path',
    path,
    '--publish',
  ]);
}
function run(cmd: string, args: string[]) {
  return new Promise<void>((res, rej) =>
    require('child_process').execFile(cmd, args, (e) => (e ? rej(e) : res())),
  );
}
