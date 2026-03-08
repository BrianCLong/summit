"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPR = createPR;
const simple_git_1 = __importDefault(require("simple-git"));
const store_1 = require("./store");
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const execAsync = util_1.default.promisify(child_process_1.exec);
const git = (0, simple_git_1.default)();
const store = new store_1.Store();
async function createPR(taskId) {
    const task = store.getTask(taskId);
    if (!task) {
        console.error(chalk_1.default.red(`Task ${taskId} not found.`));
        return;
    }
    if (task.status !== 'ready-for-pr') {
        console.log(chalk_1.default.yellow(`Task ${taskId} is not marked as ready-for-pr. Proceeding anyway...`));
    }
    console.log(chalk_1.default.blue(`Initiating PR flow for task: ${task.title}`));
    // 1. Basic Checks
    console.log(chalk_1.default.blue('Running basic checks...'));
    try {
        // Check for lint script
        // We assume we are in root
        await execAsync('npm run lint --if-present');
        console.log(chalk_1.default.green('Lint check passed (or skipped if not present).'));
    }
    catch (error) {
        console.error(chalk_1.default.red('Basic checks failed. Please fix lint errors before creating PR.'));
        // console.error(error); // Optional: show error details
        // return; // Strict mode would return here
        console.log(chalk_1.default.yellow('Continuing despite lint failure (MVP mode)...'));
    }
    // 2. Git Operations
    try {
        const status = await git.status();
        const branchName = `feat/${taskId}`;
        if (status.current !== branchName) {
            console.log(chalk_1.default.blue(`Switching to branch ${branchName}...`));
            // Check if branch exists
            const branches = await git.branchLocal();
            if (branches.all.includes(branchName)) {
                await git.checkout(branchName);
            }
            else {
                await git.checkoutLocalBranch(branchName);
            }
        }
        if (status.files.length > 0) {
            console.log(chalk_1.default.blue('Committing changes...'));
            await git.add('.');
            await git.commit(`feat: ${task.title} (Task ${taskId})`);
        }
        else {
            console.log(chalk_1.default.yellow('No changes to commit.'));
        }
        console.log(chalk_1.default.blue('Pushing to origin...'));
        // Catch error if remote branch doesn't exist
        try {
            await git.push('origin', branchName, ['--set-upstream']);
        }
        catch (e) {
            // Retry or assume it's fine if already pushed
            console.warn(chalk_1.default.yellow('Push might have failed or needs upstream set. trying again...'));
            await git.push(['-u', 'origin', branchName]);
        }
        // 3. Create PR using gh CLI
        console.log(chalk_1.default.blue('Creating PR...'));
        try {
            const { stdout } = await execAsync(`gh pr create --title "feat: ${task.title}" --body "Closes ${taskId}\n\nAutomated PR from Summit Control Plane." --head ${branchName} --base main`);
            console.log(chalk_1.default.green('PR Created Successfully!'));
            console.log(stdout);
            // Update status to archived (or we could have a 'pr-created' status)
            // For now, let's leave it as ready-for-pr or active until merged.
            // The prompt asks to "mark ones ready for PR" then "trigger PR creation".
            // Maybe we should archive it after merge, but here we just created it.
        }
        catch (error) {
            console.error(chalk_1.default.red('Failed to create PR using gh CLI. Make sure gh is installed and authenticated.'));
            console.log(chalk_1.default.blue(`You can manually create a PR for branch: ${branchName}`));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Git operations failed.'));
        console.error(error);
    }
}
