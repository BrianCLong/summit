import { execSync } from "child_process";

function main() {
  const commands = ["pnpm lint", "pnpm typecheck", "pnpm test", "pnpm test:e2e"];

  for (const command of commands) {
    try {
      console.log(`🚀 Running: ${command}`);
      execSync(command, { stdio: "inherit" });
    } catch (err) {
      console.error(`🚨 Command failed: ${command}`);
      process.exit(1);
    }
  }

  console.log("✅ CI Parity Check Passed.");
}

main();
