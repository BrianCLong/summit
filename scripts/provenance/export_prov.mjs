import { ProvExporter } from "../../packages/provenance-exporter/dist/index.js";
import { writeFileSync } from "fs";

// Create exporter
const exporter = new ProvExporter({
  "ex": "http://example.org/"
});

console.log("Creating PROV document...");

// Agents
const user = "ex:Alice";
exporter.addAgent(user, {
  "prov:type": "Person",
  "ex:role": "DataScientist"
});

// Entities
const dataset1 = "ex:dataset1";
const dataset2 = "ex:dataset2";
const model = "ex:model_v1";

exporter.addEntity(dataset1, { "prov:type": "Dataset", "ex:path": "s3://bucket/data1.csv" });
exporter.addEntity(dataset2, { "prov:type": "Dataset", "ex:path": "s3://bucket/data2.csv" });
exporter.addEntity(model, { "prov:type": "Model", "ex:accuracy": 0.95 });

// Activities
const trainingRun = "ex:run_123";
const startTime = new Date("2023-10-27T10:00:00Z");
const endTime = new Date("2023-10-27T10:30:00Z");

exporter.addActivity(trainingRun, startTime, endTime, { "ex:algorithm": "XGBoost" });

// Relations
exporter.addUsed(trainingRun, dataset1);
exporter.addUsed(trainingRun, dataset2);
exporter.addWasGeneratedBy(model, trainingRun, endTime);
exporter.addWasAssociatedWith(trainingRun, user);
exporter.addWasAttributedTo(model, user);
exporter.addWasDerivedFrom(model, dataset1);

// Export
const json = exporter.getJson();
const jsonString = JSON.stringify(json, null, 2);

console.log(jsonString);

// Write to file
const outputPath = "prov_export.json";
writeFileSync(outputPath, jsonString);
console.log(`Exported to ${outputPath}`);
