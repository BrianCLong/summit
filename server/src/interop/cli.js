"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const validator_js_1 = require("./mapping/validator.js");
const engine_js_1 = require("./mapping/engine.js");
const program = new commander_1.Command();
program
    .name('interop:map')
    .description('Map external JSON to canonical format using a mapping spec')
    .requiredOption('--spec <path>', 'Path to mapping spec JSON')
    .requiredOption('--input <path>', 'Path to input JSON')
    .requiredOption('--out <path>', 'Path to output JSON')
    .action((options) => {
    try {
        // Read files
        const specContent = fs.readFileSync(options.spec, 'utf-8');
        const inputContent = fs.readFileSync(options.input, 'utf-8');
        // Parse JSON
        const specJson = JSON.parse(specContent);
        const inputJson = JSON.parse(inputContent);
        // Validate Spec
        const validSpec = validator_js_1.SpecValidator.validate(specJson);
        // Execute Mapping
        const engine = new engine_js_1.MappingEngine(validSpec);
        const result = engine.execute(inputJson);
        if (result.errors.length > 0) {
            console.error('Mapping failed with errors:');
            result.errors.forEach(e => console.error(`- ${e}`));
            process.exit(1);
        }
        // Write Output
        fs.writeFileSync(options.out, JSON.stringify(result, null, 2));
        console.log(`Mapping successful. Output written to ${options.out}`);
        if (Object.keys(result.quarantined).length > 0) {
            console.warn('Warning: Some fields were quarantined.');
        }
    }
    catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
});
program.parse(process.argv);
