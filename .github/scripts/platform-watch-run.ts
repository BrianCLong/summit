import { spawn } from 'child_process';

function getDate(): string {
  return new Date().toISOString().slice(0, 10);
}

async function run(): Promise<void> {
  const date = process.env.PLATFORM_WATCH_DATE ?? getDate();
  await new Promise<void>((resolve, reject) => {
    const child = spawn('pnpm', ['platform-watch:run', `--date=${date}`], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`platform-watch run failed with code ${code}`));
    });
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
