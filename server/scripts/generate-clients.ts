import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openApiSpecPath = path.resolve(__dirname, '../public/openapi.json');
const outputDir = path.resolve(__dirname, '../../clients');

const languages = ['typescript-axios', 'python'];

// Ensure spec exists
import './generate-openapi.js';

console.log('Generating API clients...');

languages.forEach((lang) => {
    const langOutputDir = path.join(outputDir, lang);
    console.log(`Generating ${lang} client in ${langOutputDir}...`);

    try {
        // Using openapi-generator-cli via npx
        // Note: This requires java to be installed in the environment
        const command = `npx @openapitools/openapi-generator-cli generate -i ${openApiSpecPath} -g ${lang} -o ${langOutputDir} --additional-properties=npmName=@summit/client-${lang}`;
        execSync(command, { stdio: 'inherit' });
        console.log(`Successfully generated ${lang} client.`);
    } catch (error) {
        console.error(`Failed to generate ${lang} client:`, error);
        // Do not exit process, try next language
    }
});
