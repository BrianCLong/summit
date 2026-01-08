import fs from "fs";
import path from "path";

const distDir = path.join(process.cwd(), "dist");
fs.mkdirSync(distDir, { recursive: true });
const html = `<!doctype html><html><head><title>IntelGraph UI</title></head><body><h1>IntelGraph Preview</h1></body></html>`;
fs.writeFileSync(path.join(distDir, "index.html"), html);
