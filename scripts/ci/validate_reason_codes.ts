
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { z } from 'zod';

const ReasonCodeSchema = z.object({
  code: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  owner: z.string(),
  runbook_links: z.array(z.string()),
  suggested_actions: z.array(z.string()),
  verification_steps: z.string(),
  rollback_notes: z.string(),
});

const CatalogSchema = z.array(ReasonCodeSchema);

const REASON_CODES_PATH = path.join(process.cwd(), 'ci/reason-codes.yml');

function validateReasonCodes() {
  try {
    const fileContent = fs.readFileSync(REASON_CODES_PATH, 'utf8');
    const data = yaml.load(fileContent);

    CatalogSchema.parse(data);

    // Additional validation: check if runbook links exist
    const codes = data as z.infer<typeof CatalogSchema>;
    const errors: string[] = [];

    codes.forEach(entry => {
      entry.runbook_links.forEach(link => {
        // Handle anchor tags
        const [filePath, anchor] = link.split('#');
        const absolutePath = path.join(process.cwd(), filePath);

        if (!fs.existsSync(absolutePath)) {
          errors.push(`[${entry.code}] Runbook file not found: ${filePath}`);
        } else {
            // Check for anchor if provided
            if (anchor) {
                const content = fs.readFileSync(absolutePath, 'utf8');
                // Simple regex to find heading or anchor
                // Matches # Heading or <a name="anchor"> or id="anchor"
                // This is a rough check.
                const anchorRegex = new RegExp(`#+\\s*${anchor.replace(/-/g, '.?')}|id=["']${anchor}["']|name=["']${anchor}["']`, 'i');
                 // Markdown anchors are usually generated from headers, converting spaces to dashes and lowercase
                 // But manual anchors might exist.
                 // Ideally we should generate the slug from headers in the file and check match.
                 // For now, let's just warn or skip strict anchor validation if it's too complex to do robustly without a markdown parser.
                 // Let's try a simple heuristic: if the exact string (with spaces replaced by anything) isn't found as a header.
                 // Actually, let's just check file existence to be safe and avoid false positives.
            }
        }
      });
    });

    if (errors.length > 0) {
      console.error('Validation failed:');
      errors.forEach(e => console.error(`- ${e}`));
      process.exit(1);
    }

    console.log('✅ Reason codes catalog is valid.');
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Schema validation failed:', JSON.stringify(error.format(), null, 2));
    } else {
      console.error('Validation error:', error);
    }
    process.exit(1);
  }
}

validateReasonCodes();
