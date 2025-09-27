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
}

module.exports = SocialService;

