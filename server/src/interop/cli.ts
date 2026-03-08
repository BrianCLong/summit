import { Command } from 'commander';
import * as fs from 'fs';
import { SpecValidator } from './mapping/validator.js';
import { MappingEngine } from './mapping/engine.js';

const program = new Command();

program
  .name('interop:map')
  .description('Map external JSON to canonical format using a mapping spec')
  .requiredOption('--spec <path>', 'Path to mapping spec JSON')
  .requiredOption('--input <path>', 'Path to input JSON')
  .requiredOption('--out <path>', 'Path to output JSON')
  .action((options) => {
    try {
      // Read files
      const specContent = fs.readFileSync(options.spec, 'utf-8');
      const inputContent = fs.readFileSync(options.input, 'utf-8');

      // Parse JSON
      const specJson = JSON.parse(specContent);
      const inputJson = JSON.parse(inputContent);

      // Validate Spec
      const validSpec = SpecValidator.validate(specJson);

      // Execute Mapping
      const engine = new MappingEngine(validSpec);
      const result = engine.execute(inputJson);

      if (result.errors.length > 0) {
        console.error('Mapping failed with errors:');
        result.errors.forEach(e => console.error(`- ${e}`));
        process.exit(1);
      }

      // Write Output
      fs.writeFileSync(options.out, JSON.stringify(result, null, 2));
      console.log(`Mapping successful. Output written to ${options.out}`);
      if (Object.keys(result.quarantined).length > 0) {
        console.warn('Warning: Some fields were quarantined.');
      }

    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
