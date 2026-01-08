#!/usr/bin/env node

import fs from 'fs';
import { Parser } from 'xml2js';
import yargs from 'yargs-parser';

const main = async () => {
  const args = yargs(process.argv.slice(2));
  const inputFile = args.inputFile || 'artifacts/triage/junit.xml';
  const outputFile = args.outputFile || 'artifacts/triage/failing_tests.log';

  if (!fs.existsSync(inputFile)) {
    console.warn(`JUnit report not found at: ${inputFile}`);
    return;
  }

  const xmlContent = fs.readFileSync(inputFile, 'utf8');
  const parser = new Parser();

  try {
    const result = await parser.parseStringPromise(xmlContent);
    const failingTests = new Set();

    if (result.testsuites && result.testsuites.testsuite) {
      result.testsuites.testsuite.forEach(suite => {
        if (suite.testcase) {
          suite.testcase.forEach(testcase => {
            if (testcase.failure) {
              // The file path is often in the `file` attribute of the testsuite
              if (suite.$.file) {
                failingTests.add(suite.$.file);
              }
            }
          });
        }
      });
    }

    fs.writeFileSync(outputFile, Array.from(failingTests).join('\n'));
    console.log(`Failing tests extracted to: ${outputFile}`);
  } catch (e) {
    console.error(`Error parsing JUnit XML: ${inputFile}`, e);
  }
};

main();
