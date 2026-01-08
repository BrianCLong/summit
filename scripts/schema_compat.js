import { run } from "./schema-compat/cli.mjs";

run(process.argv.slice(2)).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
