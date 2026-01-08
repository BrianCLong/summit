const fs = require("fs");

const oldFile = process.argv[2];
const newFile = process.argv[3];

if (!oldFile || !newFile) {
  console.error("Usage: node gen_dep_diff.js <old-json> <new-json>");
  process.exit(1);
}

function loadDeps(file) {
  try {
    const content = fs.readFileSync(file, "utf8");
    const json = JSON.parse(content);
    return { ...json.dependencies, ...json.devDependencies };
  } catch (e) {
    return {};
  }
}

const oldDeps = loadDeps(oldFile);
const newDeps = loadDeps(newFile);

const allKeys = new Set([...Object.keys(oldDeps), ...Object.keys(newDeps)]);
const added = [];
const removed = [];
const changed = [];

allKeys.forEach((key) => {
  const oldVal = oldDeps[key];
  const newVal = newDeps[key];

  if (!oldVal && newVal) {
    added.push({ name: key, version: newVal });
  } else if (oldVal && !newVal) {
    removed.push({ name: key, version: oldVal });
  } else if (oldVal !== newVal) {
    changed.push({ name: key, from: oldVal, to: newVal });
  }
});

if (added.length === 0 && removed.length === 0 && changed.length === 0) {
  console.log("No dependency changes.");
  process.exit(0);
}

console.log("### Dependency Changes");
if (added.length > 0) {
  console.log("#### Added");
  added.forEach((d) => console.log(`- \`${d.name}\`: \`${d.version}\``));
}
if (removed.length > 0) {
  console.log("#### Removed");
  removed.forEach((d) => console.log(`- \`${d.name}\`: \`${d.version}\``));
}
if (changed.length > 0) {
  console.log("#### Changed");
  changed.forEach((d) => console.log(`- \`${d.name}\`: \`${d.from}\` -> \`${d.to}\``));
}
