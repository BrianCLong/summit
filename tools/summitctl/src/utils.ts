import { exec } from 'child_process';
import util from 'util';
import chalk from 'chalk';
import ora from 'ora';

export const execAsync = util.promisify(exec);

export async function runCommand(command: string, description: string): Promise<string> {
  const spinner = ora(description).start();
  try {
    const { stdout } = await execAsync(command);
    spinner.succeed();
    return stdout;
  } catch (error: any) {
    spinner.fail();
    console.error(chalk.red(`Command failed: ${command}`));
    console.error(chalk.red(error.message));
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    throw error;
  }
}

export async function runCommandWithStream(command: string, description: string): Promise<void> {
    console.log(chalk.blue(`\n> ${description}...`));
    return new Promise((resolve, reject) => {
        const child = exec(command);

        child.stdout?.on('data', (data) => {
            process.stdout.write(data);
        });

        child.stderr?.on('data', (data) => {
            process.stderr.write(data);
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(chalk.green(`✓ ${description} completed`));
                resolve();
            } else {
                console.error(chalk.red(`✗ ${description} failed with code ${code}`));
                reject(new Error(`Command failed with code ${code}`));
            }
        });
    });
}
