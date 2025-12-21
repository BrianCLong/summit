#!/usr/bin/env node

import axios from 'axios';
import fs from 'fs';

const [bundleId, outputPath] = process.argv.slice(2);

if (!bundleId || !outputPath) {
  console.error('Usage: pcl-bundle <bundleId> <outputPath>');
  process.exit(1);
}

async function run() {
  try {
    const baseUrl = process.env.PCL_BASE_URL || 'http://localhost:4010';
    const res = await axios.get(`${baseUrl}/manifest/${bundleId}`);
    fs.writeFileSync(outputPath, JSON.stringify(res.data, null, 2));
    console.log(`Bundle ${bundleId} written to ${outputPath}`);
  } catch (err: any) {
    console.error('Failed to bundle manifest', err?.message || err);
    process.exit(1);
  }
}

run();
