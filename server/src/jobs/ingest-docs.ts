// @ts-nocheck
import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';
import EmbeddingService from '../services/EmbeddingService.js';
import pino from 'pino';

const logger = pino({ name: 'DocsIngestion' });

// Simple frontmatter parser
function parseFrontmatter(content: string) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { metadata: {}, body: content };
  }

  const frontmatterRaw = match[1];
  const body = match[2];
  const metadata: any = {};

  frontmatterRaw.split('\n').forEach(line => {
    const [key, ...values] = line.split(':');
    if (key && values.length) {
      const val = values.join(':').trim();
      // Basic YAML list handling
      if (val.startsWith('[') && val.endsWith(']')) {
         metadata[key.trim()] = val.slice(1, -1).split(',').map((s: string) => s.trim());
      } else {
         metadata[key.trim()] = val;
      }
    }
  });

  return { metadata, body };
}

async function getFiles(dir: string): Promise<string[]> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

export async function ingestDocs() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const embeddingService = new EmbeddingService();

  try {
    const docsDir = path.resolve(process.cwd(), '../docs'); // Assuming running from server/
    logger.info(`Scanning docs in ${docsDir}`);

    // Check if directory exists
    try {
        await fs.access(docsDir);
    } catch {
        logger.error(`Docs directory not found at ${docsDir}`);
        return;
    }

    const files = await getFiles(docsDir);
    const markdownFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

    logger.info(`Found ${markdownFiles.length} markdown files`);

    for (const file of markdownFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const { metadata, body } = parseFrontmatter(content);

        // Skip if body is empty
        if (!body.trim()) continue;

        const relPath = path.relative(docsDir, file);
        // Use title from metadata or filename
        const title = metadata.title || path.basename(file, path.extname(file));

        logger.info(`Processing ${relPath}`);

        // Generate embedding for the first chunk (simplified for MVP)
        // In production, we'd chunk larger docs.
        // We truncate to avoid token limits roughly.
        const textToEmbed = `${title}\n${body}`.slice(0, 8000);

        const vector = await embeddingService.generateEmbedding({ text: textToEmbed });
        const vectorStr = `[${vector.join(',')}]`;

        await pool.query(
          `INSERT INTO knowledge_articles (path, title, content, metadata, embedding, updated_at, last_ingested_at)
           VALUES ($1, $2, $3, $4, $5::vector, NOW(), NOW())
           ON CONFLICT (path) DO UPDATE SET
             title = EXCLUDED.title,
             content = EXCLUDED.content,
             metadata = EXCLUDED.metadata,
             embedding = EXCLUDED.embedding,
             updated_at = NOW(),
             last_ingested_at = NOW()`,
          [relPath, title, body, JSON.stringify(metadata), vectorStr]
        );

      } catch (err: any) {
        logger.error({ err, file }, 'Failed to process file');
      }
    }

    logger.info('Docs ingestion complete');

  } catch (err: any) {
    logger.error({ err }, 'Ingestion failed');
  } finally {
    await pool.end();
  }
}

// Allow standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  ingestDocs();
}
