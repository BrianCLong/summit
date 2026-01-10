import fs from 'node:fs';

export function parseControlRegistry(mdPath) {
  const md = fs.readFileSync(mdPath, 'utf8');
  const rows = [];

  const lines = md.split('\n').map(l => l.trim()).filter(l => /^\|/.test(l));

  for (const line of lines) {
    // Remove bold markdown from columns for cleaner ID/Name
    // But user wants regex match? ID is likely plain.
    const cols = line.split('|').map(s => s.trim().replace(/^\*\*(.*)\*\*$/, '$1'));

    // Skip if not enough columns
    if (cols.length < 5) continue;

    // Skip divider lines
    if (/^[|\s\-:]+$/.test(line)) continue;

    // Skip header lines
    const c1 = cols[1].toLowerCase();
    const c2 = cols[2].toLowerCase();
    if (c1 === 'id' || c1 === 'control id' || c2 === 'control name' || c2 === 'name') continue;

    let id, name, intent, mapped, owner, evidence;

    // 5 cols: "", ID, Name, Desc, Enforcement, "" (length 6)
    // 4 cols: "", ID, Name, Desc, Enforcement (length 5 if last pipe missing)
    // User format: 6 cols -> length 8 with start/end pipes

    // Current file has: | ID | Control Name | Description | Enforcement |
    // Split: ["", "ID", "Control Name", "Description", "Enforcement", ""] -> Length 6

    if (cols.length === 6) {
        id = cols[1];
        name = cols[2];
        intent = "P0"; // Default
        mapped = cols[4];
        owner = "System";
        evidence = "N/A";
    } else if (cols.length >= 7) {
        // Assume user format
        id = cols[1];
        name = cols[2];
        intent = cols[3];
        mapped = cols[4];
        owner = cols[5];
        evidence = cols[6];
    } else {
        // Fallback for weird rows?
        // Let's log if needed but skip for now
        continue;
    }

    if (id && name) {
        // mapped checks might be "script (detail)". extracting checks.
        // We split by newline if mapped column has multiple lines? Or comma.
        // The validator matches: control.mappedChecks.some(m => hay.includes(m.toLowerCase()))
        // So we want exact strings like "pnpm typecheck".
        // In the table I added: `pnpm typecheck` (tsc)
        // In trace: cmd="pnpm typecheck"
        // If I extract "pnpm typecheck" it matches.

        // I'll take the whole string as one check, and maybe split by comma if present.
        const mappedChecks = mapped ? mapped.split(',').map(s => s.trim()).filter(Boolean) : [];

        // Clean up markdown code blocks if present? `cmd` -> cmd
        const cleanChecks = mappedChecks.map(c => c.replace(/`/g, '').replace(/\(.*\)/, '').trim());

        rows.push({ id, name, intent, mappedChecks: cleanChecks, owner, evidence });
    }
  }
  return rows;
}
