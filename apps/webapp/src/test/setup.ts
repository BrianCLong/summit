import '@testing-library/jest-dom';

console.log('Setup file is executing (using require)...');

const util = require('util');
console.log('TextEncoder in util:', !!util.TextEncoder);

globalThis.TextEncoder = util.TextEncoder;
globalThis.TextDecoder = util.TextDecoder;
