#!/usr/bin/env node
import('../src/index.js').then(module => module.run(process.argv)).catch(error => {
  console.error("Railhead CLI failed:", error);
  process.exit(1);
});
