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
exports.checkDrift = checkDrift;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
function checkDrift() {
    const tacticsPath = path.join(__dirname, '../../config/ontology/ai-influence-campaign/tactics.catalog.json');
    const techniquesPath = path.join(__dirname, '../../config/ontology/ai-influence-campaign/techniques.catalog.json');
    const fixturesDir = path.join(__dirname, '../../config/ontology/ai-influence-campaign/fixtures');
    const tacticsContent = JSON.parse(fs.readFileSync(tacticsPath, 'utf8'));
    const tacticsSet = new Set(tacticsContent.map((t) => t.id));
    const techniquesContent = JSON.parse(fs.readFileSync(techniquesPath, 'utf8'));
    const techniquesSet = new Set(techniquesContent.map((t) => t.id));
    let driftDetected = false;
    const unknownTactics = new Set();
    const unknownTechniques = new Set();
    const fixtureFiles = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json'));
    fixtureFiles.forEach(f => {
        const filePath = path.join(fixturesDir, f);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (content.tactics) {
            content.tactics.forEach((t) => {
                if (!tacticsSet.has(t.tactic_id)) {
                    driftDetected = true;
                    unknownTactics.add(t.tactic_id);
                }
                if (t.technique_ids) {
                    t.technique_ids.forEach((techniqueId) => {
                        if (!techniquesSet.has(techniqueId)) {
                            driftDetected = true;
                            unknownTechniques.add(techniqueId);
                        }
                    });
                }
            });
        }
    });
    if (driftDetected) {
        console.error('Drift detected in AI Influence Campaign Ontology:');
        if (unknownTactics.size > 0) {
            console.error(`Unknown tactics used in fixtures: ${Array.from(unknownTactics).join(', ')}`);
        }
        if (unknownTechniques.size > 0) {
            console.error(`Unknown techniques used in fixtures: ${Array.from(unknownTechniques).join(', ')}`);
        }
        process.exit(1);
    }
    else {
        console.log('No drift detected. All tactics and techniques are registered.');
    }
}
// Execute when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    checkDrift();
}
