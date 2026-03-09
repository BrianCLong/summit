const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg['lint-staged'] = {
  "*.{ts,tsx,js,jsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,yml,yaml}": [
    "prettier --write"
  ]
};

pkg.scripts.prepare = "husky install";

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
