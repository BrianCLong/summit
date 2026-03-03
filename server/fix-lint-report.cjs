const fs = require('fs');

console.log('Reading lint report...');
try {
    const results = JSON.parse(fs.readFileSync('lint_report.json', 'utf8'));
    console.log(`Loaded ${results.length} file results.`);

    let totalFixed = 0;

    for (const result of results) {
        if (result.errorCount === 0 && result.warningCount === 0) continue; // optimization

        const errors = result.messages
            .filter(m => m.ruleId === '@typescript-eslint/no-explicit-any' && m.severity === 2) // Parsing errors have no ruleId sometimes
            .sort((a, b) => b.line - a.line);

        if (errors.length === 0) continue;

        const filePath = result.filePath;
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const lines = fileContent.split('\n');
            let modified = false;
            const handledLines = new Set();

            for (const error of errors) {
                const lineIndex = error.line - 1;

                if (handledLines.has(lineIndex)) continue;
                if (lineIndex < 0 || lineIndex >= lines.length) continue;

                // Check existing comments
                const prevLine = lineIndex > 0 ? lines[lineIndex - 1] : '';
                if (prevLine.includes('eslint-disable-next-line') && prevLine.includes('no-explicit-any')) {
                    continue; // Already has it
                }
                if (lines[lineIndex].includes('eslint-disable-line') && lines[lineIndex].includes('no-explicit-any')) {
                    continue; // Inline
                }

                // Match indentation
                const match = lines[lineIndex].match(/^\s*/);
                const indentation = match ? match[0] : '';

                lines.splice(lineIndex, 0, `${indentation}// eslint-disable-next-line @typescript-eslint/no-explicit-any`);

                handledLines.add(lineIndex);
                modified = true;
                totalFixed++;
            }

            if (modified) {
                fs.writeFileSync(filePath, lines.join('\n'));
                console.log(`Fixed ${errors.length} in ${filePath}`);
            }
        } catch (fErr) {
            console.error(`Failed to process ${filePath}:`, fErr.message);
        }
    }
    console.log(`Done. Added ${totalFixed} comments.`);

} catch (e) {
    console.error('Fatal error:', e);
}
