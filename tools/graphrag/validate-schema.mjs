#!/usr/bin/env node
import fs from "fs";
import Ajv2020 from "ajv/dist/2020.js";

const ajv = new Ajv2020({ strict: false });

const retrievalSchema = JSON.parse(fs.readFileSync("schemas/graphrag/retrieval_result.schema.json", "utf8"));
const compiledSchema = JSON.parse(fs.readFileSync("schemas/graphrag/compiled_context.schema.json", "utf8"));

ajv.addSchema(retrievalSchema, "retrieval");
ajv.addSchema(compiledSchema, "compiled");

const validateRetrieval = ajv.getSchema("retrieval");
const validateCompiled = ajv.getSchema("compiled");

const targetFile = process.argv[2];
const targetType = process.argv[3]; // 'retrieval' or 'compiled'

if (!targetFile || !targetType) {
  console.error("Usage: validate-schema.mjs <file.json> <retrieval|compiled>");
  process.exit(2);
}

const fileContent = fs.readFileSync(targetFile, "utf8");
let data;
try {
  data = JSON.parse(fileContent);
} catch (e) {
  const lines = fileContent.trim().split("\n");
  data = JSON.parse(lines[0]);
}

const validate = targetType === "retrieval" ? validateRetrieval : validateCompiled;

const itemToValidate = data.retrieval ? data.retrieval : data;

if (validate(itemToValidate)) {
  console.log("Validation passed");
  process.exit(0);
} else {
  console.error("Validation failed:");
  console.error(validate.errors);
  process.exit(1);
}
