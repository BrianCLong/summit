import crypto from "crypto";
import { XMLParser } from "fast-xml-parser";
import { BaseConnector, RawItem } from "./BaseConnector";

export class RssConnector extends BaseConnector {
  kind() {
    return "RSS";
  }

  *buildRequests() {
    yield { url: this.url };
  }

  parse(xml: string): RawItem[] {
    const parser = new XMLParser({ ignoreAttributes: false });
    const doc: any = parser.parse(xml);
    const items = doc.rss?.channel?.item || [];
    const language = doc.rss?.channel?.language;
    return items.map((i: any) => ({
      id: crypto
        .createHash("sha256")
        .update(String(i.link || i.guid || i.title || Math.random()))
        .digest("hex"),
      title: i.title,
      url: i.link,
      publishedAt: i.pubDate ? new Date(i.pubDate).toISOString() : undefined,
      language,
      raw: i,
    }));
  }
}

