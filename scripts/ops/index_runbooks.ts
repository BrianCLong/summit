import fs from "fs";
import path from "path";

const RUNBOOKS_DIR = "docs/runbooks";
const README_PATH = path.join(RUNBOOKS_DIR, "README.md");

function indexRunbooks() {
  if (!fs.existsSync(RUNBOOKS_DIR)) {
    console.error(`Runbooks directory not found: ${RUNBOOKS_DIR}`);
    return;
  }

  const files = fs
    .readdirSync(RUNBOOKS_DIR, { recursive: true })
    .filter((file) => (file as string).endsWith(".md") || (file as string).endsWith(".yaml"))
    .filter((file) => !(file as string).endsWith("README.md"));

  let content = "# Operational Runbooks\n\nAutomated index of available runbooks.\n\n";

  files.forEach((file) => {
    content += `- [${file}](${file})\n`;
  });

  fs.writeFileSync(README_PATH, content, "utf-8");
  console.log(`Indexed ${files.length} runbooks to ${README_PATH}`);
}

indexRunbooks();
