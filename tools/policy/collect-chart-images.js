#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const chart = process.argv[2];
if (!chart) throw new Error('Usage: collect-chart-images <chartPath>');
const valuesPath = path.join(chart, 'values.yaml');
const raw = fs.readFileSync(valuesPath, 'utf8');
const doc = YAML.parse(raw) || {};
function printImage(doc) {
  const repo = doc.image?.repository;
  const digest = doc.image?.digest;
  if (repo && digest) {
    console.log(`${repo}@${digest}`);
  }
}
printImage(doc);
