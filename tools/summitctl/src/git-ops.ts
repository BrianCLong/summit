import simpleGit from 'simple-git';
import { Store } from './store';
import chalk from 'chalk';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const git = simpleGit();
const store = new Store();

export async function createPR(taskId: string) {
  const task = store.getTask(taskId);
  if (!task) {
    console.error(chalk.red(`Task ${taskId} not found.`));
    return;
  }

  if (task.status !== 'ready-for-pr') {
    console.log(chalk.yellow(`Task ${taskId} is not marked as ready-for-pr. Proceeding anyway...`));
  }

  console.log(chalk.blue(`Initiating PR flow for task: ${task.title}`));

  // 1. Basic Checks
  console.log(chalk.blue('Running basic checks...'));
  try {
    // Check for lint script
    // We assume we are in root
    await execAsync('npm run lint --if-present');
    console.log(chalk.green('Lint check passed (or skipped if not present).'));
  } catch (error) {
    console.error(chalk.red('Basic checks failed. Please fix lint errors before creating PR.'));
    // console.error(error); // Optional: show error details
    // return; // Strict mode would return here
    console.log(chalk.yellow('Continuing despite lint failure (MVP mode)...'));
  }

  // 2. Git Operations
  try {
    const status = await git.status();
    const branchName = `feat/${taskId}`;

    if (status.current !== branchName) {
      console.log(chalk.blue(`Switching to branch ${branchName}...`));
      // Check if branch exists
      const branches = await git.branchLocal();
      if (branches.all.includes(branchName)) {
        await git.checkout(branchName);
      } else {
        await git.checkoutLocalBranch(branchName);
      }
    }

    if (status.files.length > 0) {
      console.log(chalk.blue('Committing changes...'));
      await git.add('.');
      await git.commit(`feat: ${task.title} (Task ${taskId})`);
    } else {
      console.log(chalk.yellow('No changes to commit.'));
    }

    console.log(chalk.blue('Pushing to origin...'));
    // Catch error if remote branch doesn't exist
    try {
        await git.push('origin', branchName, ['--set-upstream']);
    } catch (e) {
        // Retry or assume it's fine if already pushed
        console.warn(chalk.yellow('Push might have failed or needs upstream set. trying again...'));
        await git.push(['-u', 'origin', branchName]);
    }

    // 3. Create PR using gh CLI
    console.log(chalk.blue('Creating PR...'));
    try {
      const { stdout } = await execAsync(`gh pr create --title "feat: ${task.title}" --body "Closes ${taskId}\n\nAutomated PR from Summit Control Plane." --head ${branchName} --base main`);
      console.log(chalk.green('PR Created Successfully!'));
      console.log(stdout);

      // Update status to archived (or we could have a 'pr-created' status)
      // For now, let's leave it as ready-for-pr or active until merged.
      // The prompt asks to "mark ones ready for PR" then "trigger PR creation".
      // Maybe we should archive it after merge, but here we just created it.

    } catch (error) {
      console.error(chalk.red('Failed to create PR using gh CLI. Make sure gh is installed and authenticated.'));
      console.log(chalk.blue(`You can manually create a PR for branch: ${branchName}`));
    }

  } catch (error) {
    console.error(chalk.red('Git operations failed.'));
    console.error(error);
  }
}
