const fs = require("fs");
const path = require("path");

// Safe list for sandbox execution
const SAFE_TARGETS = [
  "package.json",
  "server/package.json",
  "client/package.json",
  "apps/web/package.json",
];

function findPackageFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        if (
          file !== "node_modules" &&
          file !== ".git" &&
          file !== "dist" &&
          file !== "build" &&
          file !== ".next" &&
          file !== "coverage" &&
          file !== ".cache" &&
          file !== ".pnpm-store"
        ) {
          findPackageFiles(filePath, fileList);
        }
      } else {
        if (file === "package.json") {
          fileList.push(filePath);
        }
      }
    });
  } catch (e) {
    console.warn(`Could not read dir ${dir}: ${e.message}`);
  }
  return fileList;
}

function getInstalledVersion(depName, startDir) {
  let currentDir = startDir;
  const root = path.resolve(".");

  while (true) {
    const candidate = path.join(currentDir, "node_modules", depName, "package.json");
    if (fs.existsSync(candidate)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(candidate, "utf8"));
        return pkg.version;
      } catch (e) {
        // ignore
      }
    }

    if (path.resolve(currentDir) === root) break;

    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }
  return null;
}

const targetArg = process.argv[2];
let targets = [];

if (targetArg === "--all") {
  console.log("Scanning all package.json files...");
  targets = findPackageFiles(".");
} else if (targetArg === "--safe") {
  targets = SAFE_TARGETS.filter((f) => fs.existsSync(f));
} else if (targetArg) {
  targets = [targetArg];
} else {
  // Default to safe list if no args, to prevent accidents in sandbox
  targets = SAFE_TARGETS.filter((f) => fs.existsSync(f));
}

console.log(`Processing ${targets.length} files...`);

targets.forEach((file) => {
  try {
    const content = fs.readFileSync(file, "utf8");
    const pkg = JSON.parse(content);
    const dir = path.dirname(path.resolve(file));
    let modified = false;

    ["dependencies", "devDependencies", "peerDependencies"].forEach((type) => {
      if (pkg[type]) {
        Object.keys(pkg[type]).forEach((dep) => {
          const val = pkg[type][dep];
          if (typeof val !== "string") return;

          if (
            val.startsWith("workspace:") ||
            val.startsWith("file:") ||
            val.startsWith("link:") ||
            val.startsWith("git") ||
            val.startsWith("http") ||
            val.includes("/")
          ) {
            return;
          }

          let target = null;
          const installed = getInstalledVersion(dep, dir);
          if (installed) {
            target = installed;
          } else {
            target = val.replace(/^[\^~]/, "");
          }

          if (target && target !== val) {
            if (/^\d/.test(target)) {
              pkg[type][dep] = target;
              modified = true;
            }
          }
        });
      }
    });

    if (modified) {
      fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
      console.log(`Updated ${file}`);
    } else {
      console.log(`No changes for ${file}`);
    }
  } catch (err) {
    console.error(`Error processing ${file}:`, err);
  }
});

console.log("Pinning complete.");
