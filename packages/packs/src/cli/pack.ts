import { importECCPack } from '../importers/ecc_everything_claude_code.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'import') {
    const packName = args[1];
    if (packName === 'ecc/everything-claude-code') {
      console.log(`Importing ${packName}...`);
      const { manifest } = await importECCPack();
      console.log(JSON.stringify(manifest, null, 2));
      console.log("Import successful.");
    } else {
      console.error("Unknown pack:", packName);
      process.exit(1);
    }
  } else {
    console.log("Usage: pack import <pack-name>");
  }
}

main().catch(console.error);
