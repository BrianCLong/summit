#!/usr/bin/env node

import { Command } from 'commander';
import { createCommand } from './commands/create.js';
import { validateCommand } from './commands/validate.js';
import { doctorCommand } from './commands/doctor.js';

const program = new Command();

program
  .name('companyos')
  .description('Golden Path Platform CLI for CompanyOS')
  .version('1.0.0');

program.addCommand(createCommand);
program.addCommand(validateCommand);
program.addCommand(doctorCommand);

program.parse();
