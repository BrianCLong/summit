import { Client } from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
  defaultPurgeTargets,
  purgeTarget,
  type PurgeOptions,
  type PurgeTarget,
} from "../../server/src/jobs/purgeStaleData.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) return undefined;
  return args[index + 1];
}

function filterTargets(targets: PurgeTarget[], selector?: string) {
  if (!selector) return targets;
  return targets.filter((target) => target.name === selector || target.table === selector);
}

async function run() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--apply");
  const maxBatch = parseInt(getArgValue(args, "--max-batch") || "0", 10);
  const onlyTarget = getArgValue(args, "--only");

  const targets = filterTargets(defaultPurgeTargets, onlyTarget);
  if (!targets.length) {
    console.error(`No purge targets matched selector: ${onlyTarget}`);
    process.exit(1);
  }

  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing POSTGRES_URL or DATABASE_URL; refusing to run purge job");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  const options: PurgeOptions = {
    dryRun,
    maxBatchSize: maxBatch > 0 ? maxBatch : undefined,
  };

  try {
    for (const target of targets) {
      const result = await purgeTarget(client, target, options);
      const summary =
        result.action === "delete"
          ? `${result.deleted ?? 0} rows deleted`
          : `${result.anonymized ?? 0} rows anonymized`;
      console.log(
        `[purge:${target.name}] dryRun=${result.dryRun} matched=${result.matched} ${summary}${
          result.notes ? ` notes="${result.notes}"` : ""
        }`
      );
    }
  } finally {
    await client.end();
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  run().catch((error) => {
    console.error("Purge job failed", error);
    process.exit(1);
  });
}

export { run };
