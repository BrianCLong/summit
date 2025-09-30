import express from 'express';
import cors from 'cors';
import { EventEmitter } from 'events';

import { IntelAdapter, IntelItem } from './adapters/types';
import { NewsApiAdapter } from './adapters/newsapi';
import { SerpAdapter } from './adapters/serpapi';
import { EdgarAdapter } from './adapters/edgar';
import { CrunchbaseAdapter } from './adapters/crunchbase';
import { Sec13FAdapter } from './adapters/sec13f';
import { intelAdapterBatch, intelAdapterErrors, intelPollLatency, metricsMiddleware } from './metrics';

const app = express();
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);

/** simple in-mem bus; swap for Kafka/NATS later */
const bus = new EventEmitter();

type IntelItem = {
  id: string;
  ts: number;
  source: 'news'|'filing'|'social'|'pricing'|'jobs'|'web';
  title: string;
  url?: string;
  ticker?: string;
  company?: string;
  entities?: string[];
  sentiment?: number;   // -1..1
  summary?: string;
  score?: number;       // rank score
};

/** naive store + TTL cache */
const WINDOW_MS = 1000 * 60 * 60 * 24; // 24h
let items: IntelItem[] = [];

function insert(i: IntelItem){
  items.push(i);
  items = items.filter(x => x.ts > Date.now() - WINDOW_MS);
  bus.emit('intel', i);
}

const adapters: IntelAdapter[] = [
  NewsApiAdapter, SerpAdapter, EdgarAdapter, CrunchbaseAdapter, Sec13FAdapter
];
let lastPoll = Date.now() - 1000*60*60; // start 1h back

async function runAdapter(a: IntelAdapter, since:number){
  const end = intelPollLatency.labels(a.name).startTimer();
  try {
    const batch = await a.pollSince(since);
    intelAdapterBatch.labels(a.name).inc(batch.length);
    batch.forEach(insert);
  } catch(e){
    intelAdapterErrors.labels(a.name).inc(1);
    console.error('[intel] adapter failed', a.name, e);
  } finally {
    end();
  }
}

async function pollAll(){
  const since = lastPoll;
  lastPoll = Date.now();
  for (const a of adapters){
    if (!a.enabled()) continue;
    await runAdapter(a, since);
  }
}
setInterval(pollAll, Number(process.env.INTEL_POLL_MS||"60000"));

/** SSE stream */
app.get('/v1/intel/stream', (req, res) => {
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.flushHeaders();
  const listener = (i: IntelItem) => res.write(`data: ${JSON.stringify(i)}
\n`);
  bus.on('intel', listener);
  req.on('close', () => bus.off('intel', listener));
});

/** pull with query + basic ranking */
app.get('/v1/intel', (req, res) => {
  const q = ((req.query.q as string)||'').toLowerCase();
  const out = items
    .filter(i => !q || `${i.title} ${i.summary} ${i.company} ${i.ticker}`.toLowerCase().includes(q))
    .map(i => ({...i, score: (i.sentiment ?? 0)*0.1 + (i.title?.length??0)/200 }))
    .sort((a,b)=> (b.score??0)-(a.score??0))
    .slice(0, 200);
  res.json({items: out});
});

app.listen(9100, ()=> console.log('intel-aggregator on :9100'));