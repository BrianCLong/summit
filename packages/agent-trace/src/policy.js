"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCoverage = checkCoverage;
function checkCoverage(changedFiles, records) {
    const coveredFiles = new Set();
    for (const record of records) {
        for (const file of record.files) {
            coveredFiles.add(file.path);
        }
    }
    const missingFiles = changedFiles.filter(f => !coveredFiles.has(f));
    return {
        covered: missingFiles.length === 0,
        missingFiles
    };
}
