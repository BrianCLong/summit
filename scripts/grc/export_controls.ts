import fs from 'fs/promises';
import path from 'path';

// This is currently a MOCK implementation for the External Trust Roadmap (Workstream 5).
// In a real implementation, this would read from 'artifacts/compliance/latest.json' or query the Compliance Service API.

async function getComplianceState(sourceFile?: string) {
    if (sourceFile) {
        try {
            const content = await fs.readFile(sourceFile, 'utf-8');
            return JSON.parse(content);
        } catch (e) {
             console.warn(`Could not read source file ${sourceFile}, falling back to mock data.`);
        }
    }

    // Default Mock Data
    return {
        controls: [
            { id: "AC-1", name: "Access Control Policy", status: "IMPLEMENTED", owner: "Security" },
            { id: "AC-2", name: "Account Management", status: "IMPLEMENTED", owner: "IT" },
            { id: "AU-1", name: "Audit & Accountability Policy", status: "PARTIAL", owner: "Engineering" }
        ],
        exceptions: [
            { id: "EX-2023-01", control_id: "AU-1", reason: "Legacy system migration pending", expiry: "2024-01-01" }
        ]
    };
}

async function exportControls(outputDir: string, sourceFile?: string) {
    const data = await getComplianceState(sourceFile);

    // CSV Header
    const csvHeader = "Control ID,Name,Status,Owner\n";
    const csvRows = (data.controls || []).map((c: any) => `${c.id},"${c.name}",${c.status},${c.owner}`).join("\n");

    await fs.writeFile(path.join(outputDir, 'controls.csv'), csvHeader + csvRows);
    await fs.writeFile(path.join(outputDir, 'controls.json'), JSON.stringify(data.controls, null, 2));

    // Exceptions
    const excHeader = "Exception ID,Control ID,Reason,Expiry\n";
    const excRows = (data.exceptions || []).map((e: any) => `${e.id},${e.control_id},"${e.reason}",${e.expiry}`).join("\n");

    await fs.writeFile(path.join(outputDir, 'exceptions.csv'), excHeader + excRows);

    console.log(`GRC exports generated in ${outputDir}`);
}

async function main() {
  const args = process.argv.slice(2);
  const outputDir = args[0] || 'artifacts/grc/latest';
  const sourceFile = args[1]; // Optional source file

  if (args.includes('--help')) {
      console.log('Usage: tsx export_controls.ts <output_dir> [source_json_file]');
      process.exit(0);
  }

  console.log(`Exporting GRC controls to ${outputDir}...`);

  try {
    await fs.mkdir(outputDir, { recursive: true });
    await exportControls(outputDir, sourceFile);
  } catch (error) {
    console.error('Error exporting controls:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
