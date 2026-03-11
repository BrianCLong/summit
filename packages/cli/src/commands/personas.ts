import { Command } from 'commander';
import chalk from 'chalk';
import { formatOutput } from '../utils.js';
import { PersonaFusionEngine } from '../../../../src/personas/fusion_engine.js';
import { PlatformAccount } from '../../../../src/personas/identity_graph.js';

export const personasCommands = new Command('personas')
  .description('Adversarial persona inspection and analysis commands');

personasCommands
  .command('inspect')
  .description('Inspect an adversarial persona hypothesis')
  .requiredOption('--persona-id <id>', 'ID of the persona hypothesis to inspect')
  .action(async (options) => {
    // Generate synthetic mock data
    const engine = new PersonaFusionEngine();
    const accounts: PlatformAccount[] = [
      {
        platform: 'X',
        account_handle: 'haxor1',
        account_id: 'x_1',
        language: 'en',
        location: 'US',
        linkage_signals: { structural: [], content: [], temporal: [], cognitive: [] }
      },
      {
        platform: 'Telegram',
        account_handle: 'haxor1_tg',
        account_id: 'tg_1',
        language: 'ru',
        location: 'RU',
        linkage_signals: { structural: [], content: [], temporal: [], cognitive: [] }
      }
    ];
    const candidateScores = new Map<string, number>();
    const result = engine.fuse(accounts, candidateScores);

    // Find our mocked persona
    const persona = result.personas[0];
    persona.persona_id = options.personaId; // override id to match CLI arg

    console.log(chalk.bold('\n--- Persona Summary ---'));
    console.log(`Persona ID:       ${chalk.cyan(persona.persona_id)}`);
    console.log(`Confidence:       ${chalk.yellow(persona.confidence)}`);
    console.log(`Risk Profile:     ${chalk.red(persona.risk_profile)}`);
    console.log(`Deception Flag:   ${chalk.redBright(persona.deception_profile)}`);
    console.log(`Platforms:        ${persona.platforms_count}`);
    console.log(`Linked Accounts:  ${persona.accounts_count}`);

    console.log(chalk.bold('\n--- Visibility & Risk Indicators ---'));
    // Arbitrary risk calculations
    const linkageCoverageScore = (persona.platforms_count / Math.max(1, persona.accounts_count)) * 100;
    const deceptionPressureScore = persona.deception_profile !== 'NONE' ? 85 : 15;

    console.log(`Coverage Score:   ${linkageCoverageScore.toFixed(1)}%`);
    console.log(`Deception Press.: ${deceptionPressureScore}`);
    console.log(`Campaign Risk:    ${persona.risk_profile === 'CONFIRMED_ADVERSARIAL' ? 'HIGH' : 'MEDIUM'}`);

    console.log(chalk.bold('\n--- Fusion & Deception Explanation ---'));
    console.log(engine.explain_persona(persona.persona_id, accounts, result.links));
    console.log('\n');
  });
