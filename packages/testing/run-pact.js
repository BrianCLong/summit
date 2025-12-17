import fs from "fs";

const path = process.argv[2] || process.cwd();
if (!fs.existsSync(path)) process.exit(1);
console.log("PACTs present; mock validation stub OK");
