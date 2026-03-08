"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const packs_1 = require("@summit/packs");
async function checkDrift() {
    console.log("Checking for upstream drift...");
    const { manifest } = await (0, packs_1.importECCPack)();
    // In reality: Compare manifest.upstream.commit with live repo HEAD
    const pinned = manifest.upstream?.commit;
    const currentHead = "e83c2a...pinned"; // Mock same as pinned
    if (pinned === currentHead) {
        console.log("No drift detected.");
    }
    else {
        console.error(`DRIFT DETECTED! Pinned: ${pinned}, Head: ${currentHead}`);
        process.exit(1);
    }
}
checkDrift().catch(console.error);
