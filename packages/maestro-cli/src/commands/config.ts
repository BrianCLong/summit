import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

interface ConfigOptions {
  global?: boolean;
}

type ConfigData = Record<string, unknown>;

export class ConfigCommand {
  private getConfigPath(global?: boolean): string {
    const base = global ? os.homedir() : process.cwd();
    return path.join(base, '.maestro', 'config.json');
  }

  private async readConfig(global?: boolean): Promise<ConfigData> {
    const file = this.getConfigPath(global);
    try {
      const raw = await fs.readFile(file, 'utf8');
      return JSON.parse(raw) as ConfigData;
    } catch {
      return {};
    }
  }

  private async writeConfig(
    config: ConfigData,
    global?: boolean,
  ): Promise<void> {
    const file = this.getConfigPath(global);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(config, null, 2), 'utf8');
  }

  async get(key: string): Promise<void> {
    const config = await this.readConfig(false);
    // eslint-disable-next-line no-console
    console.log(config[key] ?? '<unset>');
  }

  async set(key: string, value: string, options: ConfigOptions): Promise<void> {
    const config = await this.readConfig(options.global);
    config[key] = value;
    await this.writeConfig(config, options.global);
    // eslint-disable-next-line no-console
    console.log(`Set ${key}`);
  }

  async list(options: ConfigOptions): Promise<void> {
    const config = await this.readConfig(options.global);
    Object.entries(config).forEach(([key, value]) => {
      // eslint-disable-next-line no-console
      console.log(`${key} = ${value}`);
    });
  }
}
