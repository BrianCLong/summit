import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { SchemaValidator } from './schema-validator';

export class ConfigWatcher {
  private filePath: string;
  private schemaName: string;
  private onChange: (newConfig: any) => void;
  private validator: SchemaValidator;
  private watcher: fs.FSWatcher;

  constructor(filePath: string, schemaName: string, validator: SchemaValidator, onChange: (newConfig: any) => void) {
    this.filePath = filePath;
    this.schemaName = schemaName;
    this.validator = validator;
    this.onChange = onChange;
    this.watcher = this.watch();
  }

  private watch(): fs.FSWatcher {
    return fs.watch(this.filePath, { persistent: false }, (eventType) => {
      if (eventType === 'change') {
        console.log(`Configuration file ${this.filePath} changed. Attempting to reload...`);
        try {
          const newConfigString = fs.readFileSync(this.filePath, 'utf8');
          const newConfig = yaml.load(newConfigString);
          this.validator.validate(newConfig, this.schemaName);
          this.onChange(newConfig);
          console.log('Configuration reloaded successfully.');
        } catch (error) {
          console.error('Failed to reload configuration:', (error as Error).message);
        }
      }
    });
  }

  public stop() {
    this.watcher.close();
  }
}
