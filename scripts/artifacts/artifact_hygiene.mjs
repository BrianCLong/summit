import fs from 'fs';
import path from 'path';

// Load policy or use defaults
// We can use ci_artifacts.policy.yml later but for now this is good enough
const DEFAULT_RETENTION_DAYS = 14;
const MAX_FILES = 1000;
const MAX_SIZE_MB = 100;

function getConfig() {
    let retentionDays = DEFAULT_RETENTION_DAYS;
    const policyPath = path.resolve(process.cwd(), 'policy/ci_artifacts.policy.yml');
    if (fs.existsSync(policyPath)) {
        try {
            const policyContent = fs.readFileSync(policyPath, 'utf8');
            const match = policyContent.match(/default_retention_days:\s*(\d+)/);
            if (match && match[1]) {
                retentionDays = parseInt(match[1], 10);
            }
        } catch (e) {
            console.warn('Failed to parse ci_artifacts.policy.yml, using defaults');
        }
    }
    return { retentionDays, maxFiles: MAX_FILES, maxSizeMB: MAX_SIZE_MB };
}

const ARTIFACT_DIR = path.resolve(process.cwd(), '.artifacts');

function getDirectoryFiles(dirPath, fileList = []) {
    if (!fs.existsSync(dirPath)) return fileList;

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            fileList = getDirectoryFiles(filePath, fileList);
        } else {
            fileList.push({ path: filePath, mtimeMs: stat.mtimeMs, size: stat.size });
        }
    }
    return fileList;
}

function getDirectorySize(files) {
    return files.reduce((acc, file) => acc + file.size, 0);
}

function main() {
    console.log(`Starting artifact hygiene scan for ${ARTIFACT_DIR}...`);

    if (!fs.existsSync(ARTIFACT_DIR)) {
        console.log('Artifact directory does not exist. Nothing to do.');
        return;
    }

    const config = getConfig();
    console.log(`Config: Retention: ${config.retentionDays} days, Max Files: ${config.maxFiles}, Max Size: ${config.maxSizeMB} MB`);

    let files = getDirectoryFiles(ARTIFACT_DIR);
    let size = getDirectorySize(files);

    let sizeMB = size / (1024 * 1024);
    console.log(`Current size: ${sizeMB.toFixed(2)} MB`);
    console.log(`Current file count: ${files.length}`);

    const now = Date.now();
    const retentionMs = config.retentionDays * 24 * 60 * 60 * 1000;
    let deletedCount = 0;
    let deletedSize = 0;

    // Sort files by mtimeMs (oldest first) so we always delete the oldest files when pruning
    files = files.sort((a, b) => a.mtimeMs - b.mtimeMs);

    // 1. Delete by age
    let remainingFiles = [];
    for (const file of files) {
        if (now - file.mtimeMs > retentionMs) {
            console.log(`[RETENTION] Deleting ${file.path} (Age: ${((now - file.mtimeMs) / (24*60*60*1000)).toFixed(1)} days)`);
            fs.unlinkSync(file.path);
            deletedCount++;
            deletedSize += file.size;
        } else {
            remainingFiles.push(file);
        }
    }

    // 2. Enforce file count quota
    while (remainingFiles.length > config.maxFiles) {
        const file = remainingFiles.shift(); // remove oldest
        console.log(`[QUOTA-COUNT] Deleting ${file.path}`);
        fs.unlinkSync(file.path);
        deletedCount++;
        deletedSize += file.size;
    }

    // 3. Enforce size quota
    let currentSizeMB = (size - deletedSize) / (1024 * 1024);
    while (currentSizeMB > config.maxSizeMB && remainingFiles.length > 0) {
        const file = remainingFiles.shift(); // remove oldest
        console.log(`[QUOTA-SIZE] Deleting ${file.path} (${(file.size / (1024*1024)).toFixed(2)} MB)`);
        fs.unlinkSync(file.path);
        deletedCount++;
        deletedSize += file.size;
        currentSizeMB = (size - deletedSize) / (1024 * 1024);
    }

    // Log summary
    console.log(`\nHygiene scan complete.`);
    console.log(`Files deleted: ${deletedCount}`);
    console.log(`Space freed: ${(deletedSize / (1024*1024)).toFixed(2)} MB`);

    // Output for CI
    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `deleted_count=${deletedCount}\n`);
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `freed_mb=${(deletedSize / (1024*1024)).toFixed(2)}\n`);
    }
}

main();
