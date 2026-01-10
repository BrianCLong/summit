import { parseArgs } from 'node:util';
import path from 'node:path';

// Simple ANSI color helpers
const colors = {
  red: (msg: string) => `\x1b[31m${msg}\x1b[0m`,
  green: (msg: string) => `\x1b[32m${msg}\x1b[0m`,
  yellow: (msg: string) => `\x1b[33m${msg}\x1b[0m`,
  blue: (msg: string) => `\x1b[34m${msg}\x1b[0m`,
  bold: (msg: string) => `\x1b[1m${msg}\x1b[0m`,
  dim: (msg: string) => `\x1b[2m${msg}\x1b[0m`,
};

export interface CommonOptions {
  mode: 'plan' | 'apply';
  outDir: string;
  json: boolean;
  verbose: boolean;
  [key: string]: any;
}

export const logger = {
  info: (msg: string) => console.log(msg),
  success: (msg: string) => console.log(colors.green(`✔ ${msg}`)),
  warn: (msg: string) => console.warn(colors.yellow(`⚠ ${msg}`)),
  error: (msg: string) => console.error(colors.red(`✖ ${msg}`)),
  verbose: (enabled: boolean, msg: string) => {
    if (enabled) console.log(colors.dim(`[VERBOSE] ${msg}`));
  },
  section: (title: string) => {
    console.log('\n' + colors.bold(title));
    console.log(colors.dim('='.repeat(title.length)));
  },
  json: (data: any) => {
      console.log(JSON.stringify(data, null, 2));
  }
};

export function handleExit(code: number, error?: Error) {
  if (error) {
    logger.error(error.message);
    if (process.env.VERBOSE === 'true') {
      console.error(error.stack);
    }
  }
  process.exit(code);
}

export class SimpleCommand {
  private name: string;
  private description: string;
  private options: any = {
    mode: { type: 'string', default: 'plan' },
    'out-dir': { type: 'string', default: 'artifacts/' },
    json: { type: 'boolean', default: false },
    verbose: { type: 'boolean', default: false },
  };
  private actionHandler: ((options: any) => Promise<void>) | null = null;

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }

  option(name: string, description: string, defaultValue?: any) {
    // name is like '--control <id>' or '--json'
    const isBool = !name.includes('<');
    const key = name.split(' ')[0].replace(/^--/, '');

    this.options[key] = {
      type: isBool ? 'boolean' : 'string',
      default: defaultValue
    };
    return this;
  }

  action(handler: (options: any) => Promise<void>) {
    this.actionHandler = handler;
    return this;
  }

  async parse(argv: string[]) {
    try {
      // Map our options to parseArgs config
      const optionsConfig: any = {};
      for (const [key, config] of Object.entries(this.options)) {
         optionsConfig[key] = {
             type: (config as any).type,
             default: (config as any).default
         };
      }

      // Remove the first 2 args (node, script) if present in standard process.argv
      // parseArgs expects args to be the flags only if strict is true, but we pass process.argv
      // Actually parseArgs takes 'args' option.

      const { values } = parseArgs({
        args: argv.slice(2),
        options: optionsConfig,
        strict: false, // Allow extra args if needed, or set true to be strict
        allowPositionals: true
      });

      // Convert kebab-case to camelCase for the handler
      const camelCaseValues: any = {};
      for (const [key, value] of Object.entries(values)) {
          const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          camelCaseValues[camelKey] = value;
      }

      if (this.actionHandler) {
        await this.actionHandler(camelCaseValues);
      }
    } catch (err: any) {
      handleExit(1, err);
    }
  }
}

export function createCommand(name: string, description: string) {
  return new SimpleCommand(name, description);
}
