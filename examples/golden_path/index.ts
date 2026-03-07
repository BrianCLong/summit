import { isEnabled, FeatureFlags } from "../../server/src/feature_flags/index.js";
import { redact } from "../../server/src/observability/logging/redaction.js";
import { ILogger } from "../../server/src/contracts/interfaces.js";

class ConsoleLogger implements ILogger {
  info(message: string, meta?: any) {
    console.log(`INFO: ${message}`, meta);
  }
  error(message: string, error?: Error, meta?: any) {
    console.error(`ERROR: ${message}`, error, meta);
  }
  warn(message: string, meta?: any) {
    console.warn(`WARN: ${message}`, meta);
  }
  debug(message: string, meta?: any) {
    console.debug(`DEBUG: ${message}`, meta);
  }
}

async function main() {
  console.log("🌟 Running Golden Path Example 🌟");

  // 1. Logging & Redaction
  const logger = new ConsoleLogger();
  const sensitiveData = { user: "alice", password: "secretpassword" };
  logger.info("Sanitized data:", redact(sensitiveData));

  // 2. Feature Flags
  if (isEnabled(FeatureFlags.NEW_SEARCH_ALGORITHM)) {
    logger.info("New Search Algorithm is ENABLED");
  } else {
    logger.info("New Search Algorithm is DISABLED (default)");
  }
}

main().catch(console.error);
