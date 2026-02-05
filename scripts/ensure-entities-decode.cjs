const fs = require('fs');
const path = require('path');

const root = process.cwd();
const entitiesDir = path.join(root, 'node_modules', 'entities');
const libDir = path.join(entitiesDir, 'lib');
const pkgJsonPath = path.join(entitiesDir, 'package.json');

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const writeIfMissing = (filePath, contents) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, contents, 'utf8');
  }
};

const minimalDecode = `"use strict";

const DecodingMode = {
  Attribute: 0,
  Legacy: 1,
};

class EntityDecoder {
  constructor(_tree, _callback) {
    this._callback = _callback;
  }

  startEntity() {}

  write() {
    return 0;
  }

  end() {
    return 0;
  }
}

module.exports = {
  htmlDecodeTree: {},
  EntityDecoder,
  DecodingMode,
};
`;

const minimalEscape = `"use strict";

module.exports = {
  escapeText: (value) => value,
  escapeAttribute: (value) => value,
};
`;

ensureDir(libDir);
writeIfMissing(path.join(libDir, 'decode.js'), minimalDecode);
writeIfMissing(path.join(libDir, 'escape.js'), minimalEscape);

if (!fs.existsSync(pkgJsonPath)) {
  const pkgJson = {
    name: 'entities',
    version: '0.0.0-local',
    main: 'lib/index.js',
    exports: {
      '.': {
        require: './lib/index.js',
        import: './lib/index.js',
      },
      './decode': {
        require: './lib/decode.js',
        import: './lib/decode.js',
      },
      './escape': {
        require: './lib/escape.js',
        import: './lib/escape.js',
      },
    },
  };
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf8');
} else {
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  pkgJson.exports = pkgJson.exports || {};
  pkgJson.exports['./decode'] = pkgJson.exports['./decode'] || {
    require: './lib/decode.js',
    import: './lib/decode.js',
  };
  pkgJson.exports['./escape'] = pkgJson.exports['./escape'] || {
    require: './lib/escape.js',
    import: './lib/escape.js',
  };
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n', 'utf8');
}
