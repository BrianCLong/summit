const fs = require('fs');
const brand = process.env.BRAND || 'base';
const cfg = JSON.parse(fs.readFileSync(`brands/${brand}.json`, 'utf8'));
const css = `:root{ --ig-primary:${cfg.primary}; }`;
fs.mkdirSync('docs-site/src/css', { recursive: true });
fs.writeFileSync('docs-site/src/css/brand.css', css);
const dcfg = `module.exports = { themeConfig:{ navbar:{ title: '${cfg.name}' } } }`;
fs.writeFileSync('docs-site/brand.config.js', dcfg);
console.log('Applied brand', brand);
