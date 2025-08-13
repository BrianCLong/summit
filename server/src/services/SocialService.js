const { getPostgresPool } = require('../config/database');
const fetch = require('node-fetch');

class SocialService {
  constructor() {
    this.pool = getPostgresPool();
  }

  async ingestRSS(feedUrl) {
    // Simplified RSS fetch using rss2json public endpoint or native parser in a real impl
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`);
    const data = await res.json();
    const items = data.items || [];
    for (const it of items) {
      await this._storePost({
        ext_id: it.guid || it.link,
        source: 'rss',
        author: it.author,
        text: it.title + '\n' + (it.description || ''),
        url: it.link,
        posted_at: it.pubDate,
        metadata: it
      });
    }
    return items.length;
  }

  async _storePost({ ext_id, source, author, text, url, posted_at, metadata }) {
    try {
      await this.pool.query(
        `INSERT INTO social_posts (ext_id, source, author, text, url, posted_at, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (ext_id) DO NOTHING`,
        [ext_id, source, author, text, url, posted_at, metadata]
      );
    } catch (_) {}
  }

  // Provider query stub; integrate real APIs with KeyVault tokens
  async queryProvider(provider, query, investigationId) {
    // Implement native calls where feasible; Reddit supports public search without auth
    let textBlob = '';
    try {
      if (provider === 'reddit') {
        const resp = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=10`);
        const data = await resp.json();
        const posts = (data?.data?.children || []).map(c => c.data) || [];
        for (const p of posts) {
          await this._storePost({ ext_id: `reddit:${p.id}`, source: 'reddit', author: p.author, text: `${p.title}\n${p.selftext || ''}`, url: `https://reddit.com${p.permalink}`, posted_at: new Date(p.created_utc*1000).toISOString(), metadata: p });
          textBlob += `\n${p.title} ${p.selftext || ''}`;
        }
      } else {
        textBlob = `${provider} results for ${query}`;
      }
    } catch (_) {
      textBlob = `${provider} results for ${query}`;
    }
    const mentions = this.nerExtractEntities(textBlob);
    // Optionally persist mentions as entities
    try {
      const { getNeo4jDriver } = require('../config/database');
      const driver = getNeo4jDriver();
      const session = driver.session();
      for (const m of mentions) {
        const id = `${provider}:${m.text}`;
        const props = { id, label: m.text, type: m.type || 'CUSTOM', investigation_id: investigationId };
        await session.run(`MERGE (n:Entity {id:$id}) SET n += $props`, { id, props });
      }
      await session.close();
    } catch {}
    return mentions.length;
  }

  nerExtractEntities(text) {
    const results = [];
    const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
    const emails = text.match(emailRegex) || [];
    emails.forEach(e => results.push({ type: 'EMAIL', text: e }));
    const caps = (text.match(/\b[A-Z][a-z]{2,}(?:\s[A-Z][a-z]{2,})?\b/g) || []).slice(0, 5);
    caps.forEach(c => results.push({ type: 'PERSON', text: c }));
    return results;
  }
}

module.exports = SocialService;
