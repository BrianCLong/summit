#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import fs from 'fs-extra';
import { createAdapterPackage } from '../packaging.js';
import { executeAdapter } from '../runtime.js';
import { initAdapterProject } from '../templates.js';
import { runContractTests } from '../testing/harness.js';

async function loadJsonFixture<T>(absolutePath?: string): Promise<T | undefined> {
  if (!absolutePath) {
    return undefined;
  }

  const exists = await fs.pathExists(absolutePath);
  if (!exists) {
    throw new Error(`Fixture file not found at ${absolutePath}`);
  }

  return fs.readJSON(absolutePath) as Promise<T>;
}

const program = new Command();
program
  .name('adapter-sdk')
  .description('CLI utilities for building IntelGraph adapters')
  .version('0.1.0');

program
  .command('init')
  .description('Scaffold a new adapter using a bundled template')
  .option('-t, --template <template>', 'template name', 'basic-webhook')
  .option('-d, --directory <directory>', 'target directory', 'adapter-basic-webhook')
  .option('-f, --force', 'overwrite target directory if it exists', false)
  .action(async (options) => {
    try {
      const location = await initAdapterProject({
        template: options.template,
        directory: options.directory,
        force: Boolean(options.force)
      });

      // eslint-disable-next-line no-console
      console.log(`Template ${options.template} copied to ${location}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('run')
  .description('Execute an adapter against the default or provided fixtures')
  .option('-e, --entry <entry>', 'path to built adapter entry', 'dist/adapter.js')
  .option('-p, --payload <payload>', 'path to JSON payload fixture')
  .option('-c, --context <context>', 'path to JSON context fixture')
  .action(async (options) => {
    try {
      const response = await executeAdapter({
        entry: options.entry,
        eventPath: options.payload,
        contextPath: options.context
      });

      // eslint-disable-next-line no-console
      console.log(JSON.stringify(response, null, 2));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('test')
  .description('Run the adapter contract harness')
  .option('-e, --entry <entry>', 'path to built adapter entry', 'dist/adapter.js')
  .option('-p, --payload <payload>', 'path to JSON payload fixture')
  .option('-c, --context <context>', 'path to JSON context fixture')
  .action(async (options) => {
    try {
      const payloadPath = options.payload
        ? path.resolve(process.cwd(), options.payload)
        : undefined;
      const contextPath = options.context
        ? path.resolve(process.cwd(), options.context)
        : undefined;

      const payloadFixture = await loadJsonFixture(payloadPath);
      const contextFixture = await loadJsonFixture(contextPath);

      const result = await runContractTests(
        options.entry,
        payloadFixture,
        contextFixture
      );

      if (!result.passed) {
        result.issues.forEach((issue) => {
          // eslint-disable-next-line no-console
          console.error(`✖ ${issue}`);
        });
        process.exit(1);
      }

      // eslint-disable-next-line no-console
      console.log('✔ Contract harness passed');
      if (result.response) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(result.response, null, 2));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('package')
  .description('Create a distributable bundle for an adapter')
  .option('-e, --entry <entry>', 'path to built adapter entry', 'dist/adapter.js')
  .option('-o, --output <directory>', 'output directory for bundle', 'artifacts')
  .option('-m, --manifest <manifest>', 'optional manifest filename')
  .action(async (options) => {
    try {
      const result = await createAdapterPackage({
        entry: options.entry,
        outputDir: options.output,
        manifestName: options.manifest
      });

      // eslint-disable-next-line no-console
      console.log(`Adapter manifest created at ${result.manifestPath}`);
      // eslint-disable-next-line no-console
      console.log(`Bundle contents available in ${result.bundlePath}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
