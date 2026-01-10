
import { readFileSync, writeFileSync } from 'node:fs';

const filePath = '.github/workflows/release-ops-slo-issue.yml';
let content = readFileSync(filePath, 'utf8');

// Fix unindented heredoc terminators that break YAML parsing
content = content.replace(/^BODY_START/m, '          BODY_START');
content = content.replace(/^HEADER_EOF/m, '          HEADER_EOF');
content = content.replace(/^FOOTER_EOF/m, '          FOOTER_EOF');
content = content.replace(/^GOV_SECTION_EOF/m, '          GOV_SECTION_EOF');
content = content.replace(/^LINKS_EOF/m, '          LINKS_EOF');

// Also update the cat commands to use <<- so bash accepts indented terminators
content = content.replace(/<< 'BODY_START'/g, "<<- 'BODY_START'");
content = content.replace(/<< HEADER_EOF/g, "<<- HEADER_EOF");
content = content.replace(/<< 'FOOTER_EOF'/g, "<<- 'FOOTER_EOF'");
content = content.replace(/<< GOV_SECTION_EOF/g, "<<- GOV_SECTION_EOF");
content = content.replace(/<< 'LINKS_EOF'/g, "<<- 'LINKS_EOF'");

writeFileSync(filePath, content);
console.log('✅ Fixed release-ops-slo-issue.yml heredocs');
