import fs from 'fs';
import yaml from 'js-yaml';
import { z } from 'zod';

const FLAKES_FILE = 'docs/ci/KNOWN_FLAKES.yml';

// Define the schema for a flake entry
const flakeSchema = z.object({
  id: z.string().regex(/^FLAKE-\d{3}$/, "ID must match FLAKE-### format"),
  area: z.enum(['server', 'web', 'e2e', 'infra', 'other']),
  test_selector: z.string().min(1, "test_selector is required"),
  symptom: z.string().min(1, "symptom is required"),
  owner: z.string().min(1, "owner is required"),
  ticket: z.string().url("ticket must be a valid URL"),
  introduced_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "introduced_on must be YYYY-MM-DD"),
  expires_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expires_on must be YYYY-MM-DD"),
  repro: z.string().min(1, "repro command is required"),
  mitigation_notes: z.string().optional(),
});

const registrySchema = z.array(flakeSchema);

function validateRegistry() {
  if (!fs.existsSync(FLAKES_FILE)) {
    console.error(`Error: ${FLAKES_FILE} not found.`);
    process.exit(1);
  }

  try {
    const fileContent = fs.readFileSync(FLAKES_FILE, 'utf8');
    const data = yaml.load(fileContent);

    // Validate schema
    const result = registrySchema.safeParse(data);

    if (!result.success) {
      console.error("Schema Validation Errors:");
      result.error.issues.forEach(issue => {
        console.error(` - Path: ${issue.path.join('.')}, Error: ${issue.message}`);
      });
      process.exit(1);
    }

    const flakes = result.data;
    const now = new Date();
    let hasExpired = false;
    let hasErrors = false;

    flakes.forEach(flake => {
      const expiresOn = new Date(flake.expires_on);
      const today = new Date(now.toISOString().split('T')[0]); // Compare dates only

      if (expiresOn < today) {
        console.warn(`[EXPIRED] ${flake.id} (Owner: ${flake.owner}) expired on ${flake.expires_on}. Ticket: ${flake.ticket}`);
        hasExpired = true;
      }
    });

    const isReleaseIntent = process.env.RELEASE_INTENT === 'true';

    if (hasExpired) {
      if (isReleaseIntent) {
        console.error("Error: Expired flakes found in release-intent mode.");
        process.exit(1);
      } else {
        console.warn("Warning: Expired flakes found. Please update or fix them.");
      }
    } else {
      console.log("Validation passed: No expired flakes.");
    }

  } catch (e) {
    console.error(`Error parsing or validating ${FLAKES_FILE}:`, e);
    process.exit(1);
  }
}

validateRegistry();
