'use strict';

// The compiled native module is produced by @napi-rs/cli at build time.
// Default output filename is index.node.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const addon = require('./index.node');

module.exports = {
  evaluate: addon.evaluate,
  verify: addon.verify
};
