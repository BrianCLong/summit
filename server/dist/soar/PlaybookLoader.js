import fs from 'fs';
import yaml from 'js-yaml';
export function loadPlaybook(p) {
    const doc = yaml.load(fs.readFileSync(p, 'utf8'));
    if (!doc.metadata || !doc.spec)
        throw new Error('invalid_playbook');
    return doc;
}
//# sourceMappingURL=PlaybookLoader.js.map