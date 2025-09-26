import { spawn } from 'node:child_process';

export function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: options.stdio ?? 'inherit',
      cwd: options.cwd ?? process.cwd(),
      env: { ...process.env, ...options.env },
      shell: options.shell ?? false
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        const error = new Error(`Command failed: ${command} ${args.join(' ')}`);
        error.exitCode = code;
        reject(error);
      }
    });
  });
}

export function commandExists(command) {
  return new Promise((resolve) => {
    const checker = spawn('sh', ['-c', `command -v "${command}"`], { stdio: 'ignore' });
    checker.on('close', (code) => {
      resolve(code === 0);
    });
    checker.on('error', () => {
      resolve(false);
    });
  });
}
