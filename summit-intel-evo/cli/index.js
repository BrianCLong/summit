"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../src/index.js");
const args = process.argv.slice(2);
let rounds = 50;
args.forEach(arg => {
    if (arg.startsWith('--rounds=')) {
        rounds = parseInt(arg.split('=')[1], 10);
    }
});
if (args.includes('evo')) {
    (0, index_js_1.runEvolution)(rounds).catch(err => console.error(err));
}
else {
    console.log('Usage: summit-cli evo --rounds=50');
}
