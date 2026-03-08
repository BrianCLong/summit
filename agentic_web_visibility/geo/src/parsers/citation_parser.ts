export interface ExtractedCitation {
    domain: string;
    url: string;
    mentions: number;
}

export class CitationParser {
    public parse(citations: string[]): ExtractedCitation[] {
        const citationMap = new Map<string, ExtractedCitation>();

        citations.forEach(url => {
            try {
                const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                const parsedUrl = new URL(fullUrl);
                const domain = parsedUrl.hostname.replace(/^www\./, '');

                const existing = citationMap.get(domain);
                if (existing) {
                    existing.mentions++;
                } else {
                    citationMap.set(domain, {
                        domain,
                        url: fullUrl,
                        mentions: 1
                    });
                }
            } catch (e) {
                console.warn(`Invalid URL citation: ${url}`);
            }
        });

        return Array.from(citationMap.values());
    }
}
