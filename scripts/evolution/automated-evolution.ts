import { evolveCapability } from '../../packages/capabilities/skill-evolver/evolver';

const main = async () => {
    console.log('Running automated evolution checks...');
    await evolveCapability('example-capability');
};

main();
