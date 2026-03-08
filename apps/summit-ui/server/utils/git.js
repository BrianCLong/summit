"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBranches = getBranches;
exports.getTags = getTags;
exports.getLatestCommit = getLatestCommit;
exports.countSignedCommits = countSignedCommits;
const child_process_1 = require("child_process");
const config_js_1 = require("../config.js");
function git(args) {
    try {
        return (0, child_process_1.execSync)(`git -C "${config_js_1.REPO_ROOT}" ${args}`, {
            encoding: 'utf-8',
            timeout: 10_000,
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
    }
    catch {
        return '';
    }
}
function getBranches() {
    const raw = git('branch -a');
    return raw
        .split('\n')
        .map((l) => l.replace(/^\*?\s+/, '').trim())
        .filter(Boolean)
        .map((name) => {
        const cleanName = name.replace(/^remotes\/origin\//, '');
        const remote = name.startsWith('remotes/');
        const type = cleanName.startsWith('feature/')
            ? 'feature'
            : cleanName.startsWith('fix/')
                ? 'fix'
                : cleanName.startsWith('claude/')
                    ? 'claude'
                    : 'other';
        return { name: cleanName, remote, type };
    });
}
function getTags() {
    const raw = git('tag --sort=-version:refname');
    return raw.split('\n').filter(Boolean);
}
function getLatestCommit() {
    const format = '%H|%s|%an|%ai';
    const raw = git(`log -1 --format="${format}"`);
    const [hash, message, author, date] = raw.split('|');
    return { hash: hash ?? '', message: message ?? '', author: author ?? '', date: date ?? '' };
}
function countSignedCommits(limit = 50) {
    const raw = git(`log -${limit} --format="%GK"`);
    return raw.split('\n').filter((l) => l.trim().length > 0).length;
}
