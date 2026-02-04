#!/usr/bin/env node
import { Command } from 'commander';
import { GitImporter } from '../importers/GitImporter';
import { LocalImporter } from '../importers/LocalImporter';
import { LocalSkillRegistry } from '../registry/LocalSkillRegistry';
import { SyncEngine } from '../registry/SyncEngine';
import { CursorAdapter } from '../adapters/CursorAdapter';
import * as path from 'path';

const program = new Command();

program
  .name('skillmesh')
  .description('SkillMesh Hub CLI')
  .version('0.1.0');

program
  .command('install')
  .description('Install a skill from a Git URL or local path')
  .argument('<source>', 'Git URL or local path')
  .option('--branch <branch>', 'Git branch to checkout')
  .option('--path <path>', 'Subpath within the repo')
  .action(async (source, options) => {
    try {
      const registry = new LocalSkillRegistry();
      await registry.init();

      // Detect if source is URL or local path
      let skills = [];
      if (source.startsWith('http') || source.startsWith('git@')) {
        const importer = new GitImporter();
        skills = await importer.import(source, options.branch, options.path);
      } else {
        const importer = new LocalImporter();
        skills = await importer.import(path.resolve(source));
      }

      if (skills.length === 0) {
        console.log('No skills found.');
        return;
      }

      console.log(`Found ${skills.length} skills.`);

      // Register skills
      for (const skill of skills) {
        await registry.addSkill(skill);
        console.log(`Registered skill: ${skill.manifest.name}`);
      }

      // Sync
      const adapters = [new CursorAdapter()];
      const syncEngine = new SyncEngine(adapters);
      await syncEngine.syncAll(skills);

      console.log('Installation complete.');

    } catch (error) {
      console.error('Error installing skill:', error);
      process.exit(1);
    }
  });

program
  .command('sync')
  .description('Sync all installed skills to adapters')
  .action(async () => {
    try {
      const registry = new LocalSkillRegistry();
      await registry.init();
      const skills = await registry.listSkills();

      const adapters = [new CursorAdapter()];
      const syncEngine = new SyncEngine(adapters);
      await syncEngine.syncAll(skills);

      console.log('Sync complete.');
    } catch (error) {
      console.error('Error syncing skills:', error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List installed skills')
  .action(async () => {
    try {
      const registry = new LocalSkillRegistry();
      await registry.init();
      const skills = await registry.listSkills();

      if (skills.length === 0) {
        console.log('No skills installed.');
        return;
      }

      console.log('Installed skills:');
      for (const skill of skills) {
        console.log(`- ${skill.manifest.name} (${skill.manifest.version}) [${skill.source.type}]`);
      }
    } catch (error) {
      console.error('Error listing skills:', error);
      process.exit(1);
    }
  });

program.parse();
