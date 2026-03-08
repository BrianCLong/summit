"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDisarmTaxonomy = loadDisarmTaxonomy;
const js_yaml_1 = __importDefault(require("js-yaml"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const schemas_js_1 = require("./schemas.js");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
function loadDisarmTaxonomy() {
    // Path resolution strategy:
    // We expect the taxonomy directory to be a sibling of the src (or dist) directory's parent.
    // src/taxonomy/loadTaxonomy.ts -> ../../taxonomy/disarm.v1.yaml
    // dist/taxonomy/loadTaxonomy.js -> ../../taxonomy/disarm.v1.yaml
    const taxonomyPath = node_path_1.default.resolve(__dirname, '../../taxonomy/disarm.v1.yaml');
    if (!node_fs_1.default.existsSync(taxonomyPath)) {
        throw new Error(`DISARM taxonomy file not found at ${taxonomyPath}`);
    }
    const fileContents = node_fs_1.default.readFileSync(taxonomyPath, 'utf8');
    const data = js_yaml_1.default.load(fileContents);
    return schemas_js_1.DisarmTaxonomySchema.parse(data);
}
