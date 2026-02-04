import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function die(msg) {
  console.error(`POLICY_FAIL: ${msg}`);
  process.exit(2);
}

/**
 * Streams file content into a SHA256 hash to handle files > 2GB.
 */
async function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const hash = crypto.createHash("sha256");
      const stream = fs.createReadStream(filePath);
      stream.on("data", (data) => hash.update(data));
      stream.on("end", () => resolve(hash.digest("hex")));
      stream.on("error", (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

function isDangerousMount(mountPath) {
  const norm = path.resolve(mountPath);
  const home = process.env.HOME ? path.resolve(process.env.HOME) : null;

  // Block core system paths and common secret locations
  const blocked = [
    home,
    home && path.join(home, ".ssh"),
    home && path.join(home, ".aws"),
    home && path.join(home, ".config", "gcloud"),
    "/root",
    "/etc",
    "/var",
    "/usr",
    "/bin",
    "/sbin",
    "/lib",
    "/lib64",
    "/",
    process.cwd()
  ].filter(Boolean);

  return blocked.some((b) => {
    if (norm === b) return true;
    // Allow subpaths of some but not all. For now, strict: if it starts with blocked, it's blocked.
    // Except we need to allow some subpaths in some cases? No, let's stay strict for now.
    return norm.startsWith(b + path.sep);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (flag) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : null;
  };

  const modelPath = getArg("--model");
  const expectedSha = getArg("--sha256");
  const egressPolicyPath = getArg("--egress");
  const receiptDir = getArg("--receipt");
  const mounts = args.filter((arg, i) => args[i - 1] === "--mount");

  if (!egressPolicyPath) die("Missing --egress policy file");
  if (!receiptDir) die("Missing --receipt output dir");
  if (!modelPath) die("Missing --model path");

  // REQUIRE SHA256 for verification
  if (!expectedSha || expectedSha === "" || expectedSha === "UNKNOWN") {
    die("Expected SHA256 digest is missing or UNKNOWN. Execution blocked.");
  }

  // 1. Egress Check
  if (!fs.existsSync(egressPolicyPath)) die(`Egress allowlist file not found: ${egressPolicyPath}`);
  const egressPolicy = JSON.parse(fs.readFileSync(egressPolicyPath, "utf8"));
  if (egressPolicy.deny_all !== true) {
    die("Egress policy must be deny-by-default (deny_all: true)");
  }

  // 2. Mount Check
  for (const spec of mounts) {
    const hostPath = spec.split(":")[0];
    if (isDangerousMount(hostPath)) {
      die(`Dangerous mount detected: ${hostPath}`);
    }
  }

  // 3. Model Digest Check
  try {
    const actualSha = await sha256File(modelPath);
    if (actualSha !== expectedSha) {
      die(`Digest mismatch! Expected ${expectedSha}, got ${actualSha}`);
    }
  } catch (err) {
    die(`Could not hash model file: ${err.message}`);
  }

  // 4. Receipt Dir Check
  if (!fs.existsSync(receiptDir)) {
    die(`Receipt directory missing: ${receiptDir}`);
  }

  console.log("POLICY_PASS: All checks successful.");
  process.exit(0);
}

main();
