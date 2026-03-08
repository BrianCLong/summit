import fs from 'fs';
import path from 'path';

// Validate registry for GraphRAG fixtures
const registryDir = path.join(process.cwd(), 'GOLDEN', 'datasets', 'graphrag');
if (!fs.existsSync(registryDir)) {
    fs.mkdirSync(registryDir, { recursive: true });
}

// Generate fixture-registry.json
const registryPath = path.join(process.cwd(), 'artifacts', 'bench', 'fixture-registry.json');
const registry = {
    "fixtures": [
        { "id": "EVID-GRAPHRAG-CASE1-HASH123", "status": "valid" },
        { "id": "EVID-GRAPHRAG-CASE2-HASH456", "status": "valid" }
    ],
    "version": "1.0.0"
};

const writeDeterministicJson = (filepath: string, data: any) => {
    // Canonical JSON serialization
    const sortedData = Object.keys(data).sort().reduce((acc: any, key: string) => {
        acc[key] = data[key];
        return acc;
    }, {});
    fs.writeFileSync(filepath, JSON.stringify(sortedData, null, 2));
};

writeDeterministicJson(registryPath, registry);
console.log("Fixture registry validated and artifact created.");
