#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const create_js_1 = require("./commands/create.js");
const validate_js_1 = require("./commands/validate.js");
const doctor_js_1 = require("./commands/doctor.js");
const program = new commander_1.Command();
program
    .name('companyos')
    .description('Golden Path Platform CLI for CompanyOS')
    .version('1.0.0');
program.addCommand(create_js_1.createCommand);
program.addCommand(validate_js_1.validateCommand);
program.addCommand(doctor_js_1.doctorCommand);
program.parse();
