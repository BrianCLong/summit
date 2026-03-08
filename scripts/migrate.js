"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: path_1.default.resolve(process.cwd(), '.env') });
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';
const driver = neo4j_driver_1.default.driver(NEO4J_URI, neo4j_driver_1.default.auth.basic(NEO4J_USER, NEO4J_PASSWORD), { encrypted: 'ENCRYPTION_OFF' });
async function runMigrations() {
    const session = driver.session();
    try {
        const migrationsDir = path_1.default.join(path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url)), '../server/src/db/migrations');
        const files = await promises_1.default.readdir(migrationsDir);
        const cypherFiles = files.filter((file) => file.endsWith('.cypher')).sort();
        for (const file of cypherFiles) {
            const filePath = path_1.default.join(migrationsDir, file);
            console.log(`Running migration: ${file}`);
            const cypher = await promises_1.default.readFile(filePath, 'utf8');
            await session.run(cypher);
            console.log(`Migration ${file} completed.`);
        }
        console.log('All migrations completed successfully.');
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
    finally {
        await session.close();
        await driver.close();
    }
}
runMigrations();
