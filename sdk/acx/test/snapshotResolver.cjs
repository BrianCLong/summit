const path = require('path');

module.exports = {
  resolveSnapshotPath: (testPath, snapshotExtension) => {
    const testFile = path.basename(testPath);
    return path.join(path.dirname(testPath), '..', '__snapshots__', `${testFile}${snapshotExtension}`);
  },
  resolveTestPath: (snapshotFilePath, snapshotExtension) => {
    const snapshotFile = path.basename(snapshotFilePath, snapshotExtension);
    return path.join(path.dirname(snapshotFilePath), '..', 'test', snapshotFile);
  },
  testPathForConsistencyCheck: path.join('test', 'render.test.ts')
};
