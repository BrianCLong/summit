#!/usr/bin/env node

import fs from "fs";
import yaml from "js-yaml";
import { program } from "commander";

const KNOWN_KEYS = {
  default_branch: true,
  freeze: {
    enabled: true,
    timezone: true,
    windows: {
      name: true,
      active: true,
      rrule: true,
      start: true,
      end: true,
    },
  },
  override: {
    allowed: true,
    require_reason: true,
    reason_min_len: true,
  },
};

function findUnknownKeys(obj, knownKeys, path = "") {
  const errors = [];
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      errors.push(...findUnknownKeys(item, knownKeys, `${path}[${i}]`));
    });
    return errors;
  }

  if (typeof obj !== "object" || obj === null) {
    return errors;
  }

  for (const key in obj) {
    const currentPath = path ? `${path}.${key}` : key;
    if (knownKeys[key] === undefined) {
      errors.push(`Unknown key: ${currentPath}`);
    } else {
      errors.push(...findUnknownKeys(obj[key], knownKeys[key], currentPath));
    }
  }
  return errors;
}

function validatePolicy(policy) {
  const errors = [];

  if (!policy.default_branch || typeof policy.default_branch !== "string") {
    errors.push("`default_branch` is required and must be a string.");
  }

  if (policy.freeze?.enabled) {
    if (!policy.freeze.timezone || typeof policy.freeze.timezone !== "string") {
      errors.push("`freeze.timezone` is required when freezes are enabled.");
    } else {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: policy.freeze.timezone });
      } catch (e) {
        errors.push(
          `'${policy.freeze.timezone}' is not a valid IANA timezone.`
        );
      }
    }

    if (
      !Array.isArray(policy.freeze.windows) ||
      !policy.freeze.windows.length
    ) {
      errors.push(
        "`freeze.windows` must be a non-empty array when freezes are enabled."
      );
    } else {
      policy.freeze.windows.forEach((window, i) => {
        const path = `freeze.windows[${i}]`;
        if (!window.name || typeof window.name !== "string") {
          errors.push(`'${path}.name' is required and must be a string.`);
        }
        if ("active" in window && typeof window.active !== "boolean") {
          errors.push(`'${path}.active' must be a boolean.`);
        }

        const hasRrule = "rrule" in window;
        const hasStartEnd = "start" in window && "end" in window;

        if (!hasRrule && !hasStartEnd) {
          errors.push(
            `'${path}' must have either 'rrule' or both 'start' and 'end'.`
          );
        } else if (hasRrule) {
          if (typeof window.rrule !== "string") {
            errors.push(`'${path}.rrule' must be a string.`);
          } else if (
            !window.rrule.includes("FREQ=") ||
            !window.rrule.includes("BYDAY=")
          ) {
            errors.push(
              `'${path}.rrule' must include 'FREQ=' and 'BYDAY='.`
            );
          }
        } else if (hasStartEnd) {
          if (
            typeof window.start !== "string" ||
            isNaN(Date.parse(window.start))
          ) {
            errors.push(`'${path}.start' must be a valid ISO string.`);
          }
          if (typeof window.end !== "string" || isNaN(Date.parse(window.end))) {
            errors.push(`'${path}.end' must be a valid ISO string.`);
          }
          if (
            !isNaN(Date.parse(window.start)) &&
            !isNaN(Date.parse(window.end)) &&
            new Date(window.start) >= new Date(window.end)
          ) {
            errors.push(`'${path}.start' must be before '${path}.end'.`);
          }
        }
      });
    }
  }

  if (policy.override) {
    if ("allowed" in policy.override) {
      if (typeof policy.override.allowed !== "boolean") {
        errors.push("`override.allowed` must be a boolean.");
      } else if (policy.override.allowed) {
        if (
          "require_reason" in policy.override &&
          policy.override.require_reason
        ) {
          if (
            !Number.isInteger(policy.override.reason_min_len) ||
            policy.override.reason_min_len < 1
          ) {
            errors.push(
              "`override.reason_min_len` must be an integer >= 1 when `override.require_reason` is true."
            );
          }
        }
      }
    }
  }

  const unknownKeyErrors = findUnknownKeys(policy, KNOWN_KEYS);
  errors.push(...unknownKeyErrors);

  return errors;
}

program
  .option(
    "--policy-file <path>",
    "Path to the release policy file",
    "release-policy.yml"
  )
  .option("--json", "Output errors in JSON format")
  .parse(process.argv);

const options = program.opts();

try {
  const policyFile = fs.readFileSync(options.policyFile, "utf8");
  const policy = yaml.load(policyFile);
  const errors = validatePolicy(policy);

  if (errors.length > 0) {
    if (options.json) {
      console.log(JSON.stringify({ errors }, null, 2));
    } else {
      console.error("ERROR: release-policy.yml is invalid:");
      errors.forEach((error) => console.error(`- ${error}`));
    }
    process.exit(1);
  } else {
    console.log("OK: release-policy.yml valid");
  }
} catch (e) {
  if (options.json) {
    console.log(JSON.stringify({ errors: [e.message] }, null, 2));
  } else {
    console.error(`ERROR: Could not read or parse ${options.policyFile}:`);
    console.error(e.message);
  }
  process.exit(1);
}
