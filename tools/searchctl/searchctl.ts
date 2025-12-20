import { Client } from 'typesense';
import fs from 'fs';
import path from 'path';

const typesense = new Client({
  nodes: [{
    host: process.env.TYPESENSE_HOST || 'localhost',
    port: parseInt(process.env.TYPESENSE_PORT || '8108'),
    protocol: process.env.TYPESENSE_PROTOCOL || 'http',
  }],
  apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
  connectionTimeoutSeconds: 5
});

async function listCollections() {
    try {
        const collections = await typesense.collections().retrieve();
        console.log("Collections:");
        console.table(collections.map(c => ({
            name: c.name,
            docs: c.num_documents,
            created: new Date(c.created_at * 1000).toISOString()
        })));
    } catch (e) {
        console.error("Error listing collections:", e);
    }
}

async function listAliases() {
    try {
        const aliases = await typesense.aliases().retrieve();
        console.log("Aliases:");
        console.table(aliases.collections.map(a => ({
            alias: a.name,
            target: a.collection_name
        })));
    } catch (e) {
        console.error("Error listing aliases:", e);
    }
}

async function uploadSynonyms() {
    const filePath = path.resolve(__dirname, '../../search/synonyms/general.json');
    if (!fs.existsSync(filePath)) {
        console.error(`Synonyms file not found at ${filePath}`);
        return;
    }
    console.log(`Loading synonyms from ${filePath}`);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Apply to standard collections
    const collections = ['docs', 'entities', 'events'];

    for (const base of collections) {
        const alias = `${base}@current`;
        console.log(`Applying to ${alias}...`);

        try {
            await typesense.collections(alias).retrieve();
        } catch {
            console.log(`Alias ${alias} not found, skipping.`);
            continue;
        }

        for (const syn of content.synonyms) {
            try {
                await typesense.collections(alias).synonyms().upsert(syn.root, syn);
                console.log(`  Upserted synonym: ${syn.root}`);
            } catch (e: any) {
                console.error(`  Failed to upsert ${syn.root}: ${e.message}`);
            }
        }
    }
}

async function main() {
    const cmd = process.argv[2];
    switch (cmd) {
        case 'list-collections':
            await listCollections();
            break;
        case 'list-aliases':
            await listAliases();
            break;
        case 'upload-synonyms':
            await uploadSynonyms();
            break;
        default:
            console.log("Usage: searchctl <command>");
            console.log("Commands:");
            console.log("  list-collections");
            console.log("  list-aliases");
            console.log("  upload-synonyms");
            break;
    }
}

main().catch(console.error);
