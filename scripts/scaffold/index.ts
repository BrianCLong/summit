import path from "node:path";
import {
  readFile,
  writeFile,
  toPascalCase,
  toKebabCase,
  toCamelCase,
  TEMPLATES_DIR,
  PROJECT_ROOT,
} from "./utils.js";

async function generateEndpoint(name: string) {
  const kebabName = toKebabCase(name);
  const camelName = toCamelCase(name);
  const pascalName = toPascalCase(name);

  const routeTemplate = await readFile(path.join(TEMPLATES_DIR, "endpoint/route.ts.hbs"));
  const testTemplate = await readFile(path.join(TEMPLATES_DIR, "endpoint/test.ts.hbs"));

  const routeContent = routeTemplate
    .replace(/{{KEBAB_NAME}}/g, kebabName)
    .replace(/{{CAMEL_NAME}}/g, camelName)
    .replace(/{{PASCAL_NAME}}/g, pascalName);

  const testContent = testTemplate
    .replace(/{{KEBAB_NAME}}/g, kebabName)
    .replace(/{{CAMEL_NAME}}/g, camelName)
    .replace(/{{PASCAL_NAME}}/g, pascalName);

  const routePath = path.join(PROJECT_ROOT, `server/src/routes/${kebabName}.ts`);
  const testPath = path.join(PROJECT_ROOT, `server/src/routes/__tests__/${kebabName}.test.ts`);

  await writeFile(routePath, routeContent);
  await writeFile(testPath, testContent);
}

async function generatePage(name: string) {
  const pascalName = toPascalCase(name);

  const pageTemplate = await readFile(path.join(TEMPLATES_DIR, "page/Page.tsx.hbs"));

  const pageContent = pageTemplate.replace(/{{PASCAL_NAME}}/g, pascalName);

  const pagePath = path.join(PROJECT_ROOT, `apps/web/src/pages/${pascalName}.tsx`);

  await writeFile(pagePath, pageContent);
}

async function generateJob(name: string) {
  const kebabName = toKebabCase(name);
  const camelName = toCamelCase(name);

  const jobTemplate = await readFile(path.join(TEMPLATES_DIR, "job/processor.ts.hbs"));

  const jobContent = jobTemplate
    .replace(/{{CAMEL_NAME}}/g, camelName)
    .replace(/{{KEBAB_NAME}}/g, kebabName);

  const jobPath = path.join(PROJECT_ROOT, `server/src/jobs/processors/${camelName}.processor.ts`);

  await writeFile(jobPath, jobContent);
}

async function generateMigration(name: string) {
  const kebabName = toKebabCase(name);
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14); // YYYYMMDDHHMMSS
  const filename = `${timestamp}_${kebabName.replace(/-/g, "_")}.sql`;

  const migrationTemplate = await readFile(path.join(TEMPLATES_DIR, "migration/migration.sql.hbs"));

  const migrationContent = migrationTemplate.replace(/{{NAME}}/g, name);

  const migrationPath = path.join(PROJECT_ROOT, `server/src/db/migrations/postgres/${filename}`);

  await writeFile(migrationPath, migrationContent);
}

async function generateEvent(name: string) {
  const kebabName = toKebabCase(name);
  const pascalName = toPascalCase(name);
  const camelName = toCamelCase(name);

  const eventTemplate = await readFile(path.join(TEMPLATES_DIR, "event/schema.ts.hbs"));

  const eventContent = eventTemplate
    .replace(/{{PASCAL_NAME}}/g, pascalName)
    .replace(/{{KEBAB_NAME}}/g, kebabName)
    .replace(/{{CAMEL_NAME}}/g, camelName);

  const eventPath = path.join(PROJECT_ROOT, `server/src/provenance/events/${kebabName}.ts`);

  await writeFile(eventPath, eventContent);
  console.log(
    `\n⚠️  Don't forget to export your new event in server/src/provenance/events/index.ts (if it exists) or register it in the Event Registry.`
  );
}

async function main() {
  const args = process.argv.slice(2);
  const type = args[0];
  const name = args[1];

  if (!type || !name) {
    console.error("Usage: npm run scaffold <type> <name>");
    console.error("Types: endpoint, page, job, migration, event");
    process.exit(1);
  }

  try {
    switch (type) {
      case "endpoint":
        await generateEndpoint(name);
        break;
      case "page":
        await generatePage(name);
        break;
      case "job":
        await generateJob(name);
        break;
      case "migration":
        await generateMigration(name);
        break;
      case "event":
        await generateEvent(name);
        break;
      default:
        console.error(`Unknown type: ${type}`);
        process.exit(1);
    }
    console.log("Done!");
  } catch (error) {
    console.error("Scaffolding failed:", error);
    process.exit(1);
  }
}

main();
