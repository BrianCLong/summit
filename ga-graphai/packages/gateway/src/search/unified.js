import fs from "node:fs";
import crypto from "node:crypto";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const DEFAULT_HALF_LIFE_DAYS = 14;

function parseDate(value) {
  if (!value) return undefined;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? undefined : new Date(ts);
}

function daysToMs(days) {
  return days * 24 * 60 * 60 * 1000;
}

function tokenize(text) {
  return (text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function bm25Score(queryTerms, documentTerms, idf, k1 = 1.5, b = 0.75) {
  const docLength = documentTerms.length || 1;
  const avgLength = 1;
  let score = 0;
  const termFreq = {};
  for (const term of documentTerms) {
    termFreq[term] = (termFreq[term] ?? 0) + 1;
  }
  for (const term of queryTerms) {
    const freq = termFreq[term] ?? 0;
    if (!freq) continue;
    const idfTerm = idf[term] ?? 0;
    score += idfTerm * ((freq * (k1 + 1)) / (freq + k1 * (1 - b + (b * docLength) / avgLength)));
  }
  return score;
}

function exponentialDecayBoost(eventTime, now, halfLifeDays = DEFAULT_HALF_LIFE_DAYS) {
  if (!eventTime) return 1;
  const elapsed = now - new Date(eventTime);
  if (elapsed <= 0) return 1.2;
  const lambda = Math.log(2) / daysToMs(halfLifeDays);
  return Math.exp(-lambda * elapsed);
}

function confidenceBoost(confidence) {
  if (confidence == null) return 1;
  const clamped = Math.max(0, Math.min(1, confidence));
  return 0.5 + clamped * 0.7;
}

function sourceBoost(source, weights) {
  const normalized = (source ?? "").toLowerCase();
  return weights[normalized] ?? 1;
}

function diversityPenalty(hashSeen) {
  return hashSeen ? 0.8 : 1;
}

function hashContent(doc) {
  const hash = crypto.createHash("sha256");
  hash.update(doc.title ?? "");
  hash.update("|");
  hash.update(doc.body ?? "");
  return hash.digest("hex");
}

function stableSortKey(score, doc) {
  return [-(score ?? 0), -(new Date(doc.event_time).getTime() || 0), doc.id];
}

function encodeCursor(payload, secret) {
  const json = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", secret).update(json).digest("hex");
  const token = Buffer.from(JSON.stringify({ payload: json, sig })).toString("base64url");
  return token;
}

function decodeCursor(cursor, secret) {
  if (!cursor) return undefined;
  const raw = Buffer.from(cursor, "base64url").toString("utf8");
  const parsed = JSON.parse(raw);
  const expected = crypto.createHmac("sha256", secret).update(parsed.payload).digest("hex");
  if (expected !== parsed.sig) {
    throw new Error("CURSOR_TAMPERED");
  }
  return JSON.parse(parsed.payload);
}

export class UnifiedSearchIndex {
  constructor(options = {}) {
    this.documents = [];
    this.cache = new Map();
    this.now = options.now ?? (() => new Date());
    this.cursorSecret = options.cursorSecret ?? "dev-search-secret";
    this.sourceWeights = {
      osint: 0.9,
      sigint: 1.05,
      humint: 1,
      ...options.sourceWeights,
    };
    this.halfLifeDays = options.halfLifeDays ?? DEFAULT_HALF_LIFE_DAYS;
  }

  loadFromFile(path) {
    const raw = fs.readFileSync(path, "utf8");
    const docs = JSON.parse(raw);
    this.indexDocuments(docs);
  }

  indexDocuments(docs) {
    this.documents = docs.map((doc) => ({ ...doc, _hash: hashContent(doc) }));
    this.idf = this.computeIdf(this.documents);
    this.cache.clear();
  }

  computeIdf(documents) {
    const df = {};
    for (const doc of documents) {
      const terms = new Set(
        tokenize(doc.title).concat(tokenize(doc.body)).concat(tokenize(doc.entities))
      );
      for (const term of terms) {
        df[term] = (df[term] ?? 0) + 1;
      }
    }
    const total = documents.length || 1;
    const idf = {};
    for (const [term, freq] of Object.entries(df)) {
      idf[term] = Math.log(1 + (total - freq + 0.5) / (freq + 0.5));
    }
    return idf;
  }

  query(params) {
    const start = Date.now();
    const {
      q,
      tenant_id: tenantId,
      time_from,
      time_to,
      types = [],
      sources = [],
      confidence_min,
      confidence_max,
      page_size,
      cursor,
    } = params;
    if (!tenantId) {
      throw Object.assign(new Error("TENANT_REQUIRED"), { statusCode: 400 });
    }
    if (!q || !q.trim()) {
      throw Object.assign(new Error("QUERY_REQUIRED"), { statusCode: 400 });
    }
    let decodedCursor;
    if (cursor) {
      decodedCursor = decodeCursor(cursor, this.cursorSecret);
      if (decodedCursor.tenant_id !== tenantId) {
        throw Object.assign(new Error("CURSOR_TENANT_MISMATCH"), {
          statusCode: 400,
        });
      }
    }

    const normalizedQuery = q.toLowerCase();
    const queryTerms = tokenize(normalizedQuery);
    const filters = {
      tenant: tenantId,
      types: new Set(types),
      sources: new Set(sources.map((s) => s.toLowerCase())),
      confidenceMin: confidence_min != null ? Math.max(0, Number(confidence_min)) : undefined,
      confidenceMax: confidence_max != null ? Math.min(1, Number(confidence_max)) : undefined,
      timeFrom: parseDate(time_from),
      timeTo: parseDate(time_to),
    };

    const cacheKey = JSON.stringify({ normalizedQuery, ...filters, cursor });
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      return {
        ...cached,
        perf: { ...cached.perf, cache_hit: true },
      };
    }

    const hashSeen = new Set();
    const candidateDocs = this.documents.filter((doc) => {
      if (doc.tenant_id !== tenantId) return false;
      if (filters.types.size && !filters.types.has(doc.type)) return false;
      if (filters.sources.size && !filters.sources.has(doc.source?.toLowerCase())) return false;
      if (filters.confidenceMin != null && Number(doc.confidence ?? 0) < filters.confidenceMin)
        return false;
      if (filters.confidenceMax != null && Number(doc.confidence ?? 0) > filters.confidenceMax)
        return false;
      const eventTime = parseDate(doc.event_time);
      if (filters.timeFrom && eventTime && eventTime < filters.timeFrom) return false;
      if (filters.timeTo && eventTime && eventTime > filters.timeTo) return false;
      return true;
    });

    const scored = candidateDocs.map((doc) => {
      const terms = tokenize(doc.title).concat(tokenize(doc.body)).concat(tokenize(doc.entities));
      const baseScore = bm25Score(queryTerms, terms, this.idf);
      const recency = exponentialDecayBoost(doc.event_time, this.now(), this.halfLifeDays);
      const confidence = confidenceBoost(doc.confidence);
      const source = sourceBoost(doc.source, this.sourceWeights);
      const duplicatePenalty = diversityPenalty(hashSeen.has(doc._hash));
      hashSeen.add(doc._hash);
      const score = baseScore * recency * confidence * source * duplicatePenalty;
      return { doc, score, sortKey: stableSortKey(score, doc) };
    });

    scored.sort((a, b) => {
      for (let i = 0; i < a.sortKey.length; i += 1) {
        if (a.sortKey[i] !== b.sortKey[i]) return a.sortKey[i] < b.sortKey[i] ? 1 : -1;
      }
      return 0;
    });

    const startIndex = decodedCursor?.offset ?? 0;
    const size = Math.min(Math.max(Number(page_size) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const page = scored.slice(startIndex, startIndex + size);
    const nextOffset = startIndex + page.length;
    const nextCursor =
      page.length && nextOffset < scored.length
        ? encodeCursor(
            {
              tenant_id: tenantId,
              offset: nextOffset,
              last_score: page[page.length - 1].score,
              last_event_time: page[page.length - 1].doc.event_time,
              last_id: page[page.length - 1].doc.id,
            },
            this.cursorSecret
          )
        : undefined;

    const items = page.map(({ doc, score }) => ({
      id: doc.id,
      type: doc.type,
      title: doc.title,
      snippet: doc.body?.slice(0, 160) ?? "",
      event_time: doc.event_time,
      source: doc.source,
      confidence: doc.confidence,
      tenant_id: doc.tenant_id,
      classification: doc.classification,
      highlight: termsWithHighlights(doc, queryTerms),
      ranking_features: {
        score,
        recency: exponentialDecayBoost(doc.event_time, this.now(), this.halfLifeDays),
        confidence: confidenceBoost(doc.confidence),
        source: sourceBoost(doc.source, this.sourceWeights),
      },
    }));

    const tookMs = Date.now() - start;
    const response = {
      items,
      cursor: nextCursor,
      perf: { took_ms: tookMs, cache_hit: false },
    };
    this.cache.set(cacheKey, response);
    return response;
  }
}

function termsWithHighlights(doc, queryTerms) {
  const highlights = [];
  const fields = ["title", "body"];
  for (const field of fields) {
    const value = doc[field];
    if (!value) continue;
    const lower = value.toLowerCase();
    for (const term of queryTerms) {
      const idx = lower.indexOf(term);
      if (idx >= 0) {
        highlights.push({ field, term, start: idx, end: idx + term.length });
      }
    }
  }
  return highlights;
}

export function buildSearchService(options = {}) {
  const index = new UnifiedSearchIndex(options);
  return {
    index,
    query(params) {
      return index.query(params);
    },
    reindexFromFile(path) {
      index.loadFromFile(path);
      return { indexed: index.documents.length };
    },
  };
}

export function validateSearchRequest(req) {
  const tenantId = req.query.tenant_id;
  if (!tenantId) {
    return { valid: false, status: 400, error: "TENANT_REQUIRED" };
  }
  if (!req.header("x-purpose")) {
    return { valid: false, status: 412, error: "PURPOSE_REQUIRED" };
  }
  return { valid: true };
}

export function handleSearchRoute(searchService, privacy) {
  return async function unifiedSearchHandler(req, res) {
    const validation = validateSearchRequest(req);
    if (!validation.valid) {
      return res.status(validation.status).json({ error: validation.error });
    }
    try {
      if (privacy) {
        const { decision } = privacy.enforce(req, "search");
        if (decision.alert) {
          return res.status(403).json({ error: "BUDGET_EXCEEDED", remaining: decision.remaining });
        }
      }
      const result = searchService.query({ ...req.query });
      return res.json(result);
    } catch (error) {
      const status = error.statusCode ?? 500;
      const code = error.message ?? "SEARCH_ERROR";
      return res.status(status).json({ error: code });
    }
  };
}

export function decodeSearchCursor(cursor, secret) {
  return decodeCursor(cursor, secret);
}
