#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";

const SCHEMA_VERSION = "1.0.0";

async function addSchemaVersion(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const trimmedContent = content.trim();
    let data = {};

    if (trimmedContent !== "") {
      data = JSON.parse(content);
    }

    if (data.schemaVersion) {
      console.log(`Skipping ${filePath}, schemaVersion already exists.`);
      return;
    }

    const newData = { schemaVersion: SCHEMA_VERSION, ...data };
    await fs.writeFile(filePath, JSON.stringify(newData, null, 2) + "\n");
    console.log(`Added schemaVersion to ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

async function main() {
  const [dir, files] = process.argv.slice(2);

  if (!dir || !files) {
    console.error("Usage: ./add-schema-version.mjs <directory> <file1.json,file2.json,...>");
    process.exit(1);
  }

  const fileList = files.split(",");

  for (const file of fileList) {
    const filePath = path.join(dir, file.trim());
    if ((await fs.stat(filePath)).isFile()) {
      await addSchemaVersion(filePath);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
