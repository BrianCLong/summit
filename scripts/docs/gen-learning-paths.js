const fs = require('fs');
const yaml = require('js-yaml');
const data = yaml.load(fs.readFileSync('docs/learn/paths.yml', 'utf8'));
for (const p of data.paths) {
  const slug = `docs/learn/${p.id}.mdx`;
  const mdx = `---\ntitle: ${p.title}\nsummary: Role: ${p.role} • ~${p.estMinutes} min\nowner: docs\n---\n\nimport Path from '@site/src/components/LearningPath';\n\n<Path id="${p.id}" modules={${JSON.stringify(p.modules)}} />\n`;
  fs.writeFileSync(slug, mdx);
  console.log('Generated', slug);
}
