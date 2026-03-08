"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const evolver_1 = require("../../packages/capabilities/skill-evolver/evolver");
const main = async () => {
    console.log('Running automated evolution checks...');
    await (0, evolver_1.evolveCapability)('example-capability');
};
main();
