import { execSync } from 'child_process';
import { parseArgs } from 'util';

const { values } = parseArgs({
  options: {
    sha: {
      type: 'string',
    },
    version: {
      type: 'string',
    },
    branch: {
      type: 'string',
    },
  },
});

if (!values.sha || !values.version) {
  console.error('Usage: node apply-refs.mjs --sha <commit-sha> --version <version> [--branch <branch-name>]');
  process.exit(1);
}

const runCommand = (command) => {
  try {
    console.log(`Executing: ${command}`);
    const output = execSync(command, { stdio: 'pipe' }).toString().trim();
    console.log(output);
    return { success: true, output };
  } catch (error) {
    console.error(`Error executing: ${command}`);
    console.error(error.stderr.toString());
    return { success: false, error: error.stderr.toString() };
  }
};

const main = () => {
  const { sha, version } = values;
  const tagName = version;
  const branchName = values.branch || `release/${version}`;
  const output = {
    tagCreated: null,
    branchCreated: null,
    errors: [],
  };

  // Check if tag exists locally
  const tagExists = runCommand(`git tag -l "${tagName}"`).output;
  if (tagExists) {
    const errorMsg = `Tag ${tagName} already exists.`;
    console.error(errorMsg);
    output.errors.push(errorMsg);
  } else {
    // Create tag
    const createTagResult = runCommand(`git tag ${tagName} ${sha}`);
    if (createTagResult.success) {
      // Push tag
      const pushTagResult = runCommand(`git push origin ${tagName}`);
      if (pushTagResult.success) {
        output.tagCreated = tagName;
      } else {
        output.errors.push(`Failed to push tag ${tagName}.`);
      }
    } else {
      output.errors.push(`Failed to create tag ${tagName}.`);
    }
  }

  // Create and push release branch if specified
  if (values.branch) {
      const branchExists = runCommand(`git ls-remote --heads origin ${branchName}`).output;
      if(branchExists){
        const errorMsg = `Branch ${branchName} already exists on remote.`;
        console.error(errorMsg);
        output.errors.push(errorMsg)
      } else {
        const createBranchResult = runCommand(`git checkout -b ${branchName} ${sha}`);
        if(createBranchResult.success){
            const pushBranchResult = runCommand(`git push origin ${branchName}`);
            if(pushBranchResult.success){
                output.branchCreated = branchName;
            } else {
                output.errors.push(`Failed to push branch ${branchName}.`);
            }
        } else {
            output.errors.push(\`Failed to create branch \${branchName}.\`);
        }
      }
  }


  if (output.errors.length > 0) {
    console.error('Errors occurred during ref creation:');
    output.errors.forEach(err => console.error(`- ${err}`));
    process.stdout.write(JSON.stringify(output, null, 2));
    process.exit(1);
  }

  process.stdout.write(JSON.stringify(output, null, 2));
};

main();
