import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GOLD_DIR = path.join(__dirname, '../entity-extraction/fixtures/gold');
const PRED_DIR = path.join(__dirname, '../entity-extraction/fixtures/predicted');

async function readJSONFiles(dirPath) {
  const files = await fs.readdir(dirPath);
  const jsonFiles = files.filter(f => f.endsWith('.json'));
  const docs = {};
  for (const file of jsonFiles) {
    const data = await fs.readFile(path.join(dirPath, file), 'utf-8');
    const doc = JSON.parse(data);
    docs[doc.id] = doc;
  }
  return docs;
}

function calculateF1(tp, fp, fn) {
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : 2 * (precision * recall) / (precision + recall);
  return { precision, recall, f1 };
}

function evaluateEntities(gold, pred) {
  // We match entities based on mention text and type for extraction evaluation
  const goldSet = new Set(gold.map(e => `${e.mention.toLowerCase()}|${e.type}`));
  const predSet = new Set(pred.map(e => `${e.mention.toLowerCase()}|${e.type}`));

  let tp = 0;
  for (const p of predSet) {
    if (goldSet.has(p)) tp++;
  }
  const fp = predSet.size - tp;
  const fn = goldSet.size - tp;

  return { tp, fp, fn };
}

function evaluateLinking(gold, pred) {
  // Evaluate linking accuracy for correctly extracted entities
  let correctLinks = 0;
  let totalLinked = 0;

  for (const p of pred) {
    if (!p.linked_id) continue;
    const g = gold.find(g => g.mention.toLowerCase() === p.mention.toLowerCase() && g.type === p.type);
    if (g && g.linked_id === p.linked_id) {
      correctLinks++;
    }
    totalLinked++;
  }

  return { correct: correctLinks, total: totalLinked };
}

function evaluateRelations(goldEnt, goldRel, predEnt, predRel) {
  // Map ids to mentions for matching relations
  const goldIdToMention = {};
  goldEnt.forEach(e => goldIdToMention[e.id] = e.mention.toLowerCase());

  const predIdToMention = {};
  predEnt.forEach(e => predIdToMention[e.id] = e.mention.toLowerCase());

  const goldSet = new Set(goldRel.map(r => `${goldIdToMention[r.source]}|${r.type}|${goldIdToMention[r.target]}`));
  const predSet = new Set(predRel.map(r => `${predIdToMention[r.source]}|${r.type}|${predIdToMention[r.target]}`));

  let tp = 0;
  for (const p of predSet) {
    if (goldSet.has(p)) tp++;
  }
  const fp = predSet.size - tp;
  const fn = goldSet.size - tp;

  return { tp, fp, fn };
}

async function main() {
  console.log('Loading fixtures...');
  try {
    const goldDocs = await readJSONFiles(GOLD_DIR);
    const predDocs = await readJSONFiles(PRED_DIR);

    let totalEntTp = 0, totalEntFp = 0, totalEntFn = 0;
    let totalLinkCorrect = 0, totalLinkTotal = 0;
    let totalRelTp = 0, totalRelFp = 0, totalRelFn = 0;

    for (const id in goldDocs) {
      if (!predDocs[id]) {
        console.warn(`No predicted document found for ${id}`);
        continue;
      }

      const gold = goldDocs[id];
      const pred = predDocs[id];

      const entMetrics = evaluateEntities(gold.entities, pred.entities);
      totalEntTp += entMetrics.tp;
      totalEntFp += entMetrics.fp;
      totalEntFn += entMetrics.fn;

      const linkMetrics = evaluateLinking(gold.entities, pred.entities);
      totalLinkCorrect += linkMetrics.correct;
      totalLinkTotal += linkMetrics.total;

      const relMetrics = evaluateRelations(gold.entities, gold.relations, pred.entities, pred.relations);
      totalRelTp += relMetrics.tp;
      totalRelFp += relMetrics.fp;
      totalRelFn += relMetrics.fn;
    }

    const entStats = calculateF1(totalEntTp, totalEntFp, totalEntFn);
    const relStats = calculateF1(totalRelTp, totalRelFp, totalRelFn);
    const linkAccuracy = totalLinkTotal === 0 ? 0 : totalLinkCorrect / totalLinkTotal;

    const results = {
      metrics: {
        entity_extraction: {
          tp: totalEntTp,
          fp: totalEntFp,
          fn: totalEntFn,
          precision: entStats.precision,
          recall: entStats.recall,
          f1: entStats.f1
        },
        entity_linking: {
          correct: totalLinkCorrect,
          total: totalLinkTotal,
          accuracy: linkAccuracy
        },
        relation_extraction: {
          tp: totalRelTp,
          fp: totalRelFp,
          fn: totalRelFn,
          precision: relStats.precision,
          recall: relStats.recall,
          f1: relStats.f1
        }
      }
    };

    const resultsPath = path.join(__dirname, 'results.json');
    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));

    console.log('\n========================================');
    console.log(' Knowledge Graph Evaluation Summary');
    console.log('========================================\n');

    console.log('--- Entity Extraction ---');
    console.log(`Precision: ${(entStats.precision * 100).toFixed(2)}%`);
    console.log(`Recall:    ${(entStats.recall * 100).toFixed(2)}%`);
    console.log(`F1 Score:  ${(entStats.f1 * 100).toFixed(2)}%\n`);

    console.log('--- Entity Linking ---');
    console.log(`Accuracy:  ${(linkAccuracy * 100).toFixed(2)}% (${totalLinkCorrect}/${totalLinkTotal})\n`);

    console.log('--- Relation Extraction ---');
    console.log(`Precision: ${(relStats.precision * 100).toFixed(2)}%`);
    console.log(`Recall:    ${(relStats.recall * 100).toFixed(2)}%`);
    console.log(`F1 Score:  ${(relStats.f1 * 100).toFixed(2)}%\n`);

    console.log(`Full results saved to: ${resultsPath}`);

  } catch (err) {
    console.error('Error evaluating fixtures:', err);
    process.exitCode = 1;
  }
}

main();
