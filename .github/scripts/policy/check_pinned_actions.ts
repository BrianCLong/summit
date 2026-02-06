import fs from "node:fs";

const badPatterns = [
  /uses:\s+.+@v\d+(\.\d+)?(\.\d+)?\b/i, // Matches @v1, @v1.2, @v1.2.3
  /uses:\s+.+@(main|master|latest|next|canary|beta|alpha|rc)\b/i, // Floating tags
];

const files = process.argv.slice(2);

if (files.length === 0) {
  console.log("No files provided to check.");
  process.exit(0);
}

let failed = false;

for (const f of files) {
  try {
    const content = fs.readFileSync(f, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith("#")) continue;

        for (const re of badPatterns) {
            if (re.test(line)) {
                console.error(`UNPINNED_ACTION in ${f}:${i+1}: ${line.trim()}`);
                failed = true;
            }
        }
    }
  } catch (err) {
    console.error(`Failed to read ${f}: ${err}`);
    failed = true;
  }
}

if (failed) {
    console.error("FAILURE: Found unpinned GitHub Actions. Please pin to a commit SHA.");
    process.exit(1);
} else {
    console.log("SUCCESS: All checked actions appear pinned.");
}
