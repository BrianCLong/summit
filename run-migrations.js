import { config } from "dotenv";
import { exec } from "child_process";

config();

const migrate = exec("npx ts-node --esm scripts/migrate.ts");

migrate.stdout.on("data", (data) => {
  console.log(data);
});

migrate.stderr.on("data", (data) => {
  console.error(data);
});

migrate.on("close", (code) => {
  console.log(`child process exited with code ${code}`);
});
