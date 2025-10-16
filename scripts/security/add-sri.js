const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
function sha384(p) {
  return (
    'sha384-' +
    crypto.createHash('sha384').update(fs.readFileSync(p)).digest('base64')
  );
}
const dir = 'docs-site/build';
const index = path.join(dir, 'index.html');
let html = fs.readFileSync(index, 'utf8');
html = html.replace(/<script src="(\/assets\/[^\"]+)">/g, (m, src) =>
  m.replace(
    '>',
    ` integrity="${sha384(path.join(dir, src))}" crossorigin="anonymous">`,
  ),
);
fs.writeFileSync(index, html);
